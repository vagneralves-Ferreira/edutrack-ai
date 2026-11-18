"""Generate the academic progress report (PDF) from the user's own data export.

Input: the JSON downloaded from the app (Cockpit > "Exportar dados"). It contains only the
signed-in user's subjects and tasks, read through their normal session (RLS by user_id);
no Supabase keys are needed or used here.

Usage:
    python scripts/generate_progress_report.py --input dados.json --output relatorio.pdf

Requires: fpdf2 (pip install fpdf2)
"""

import argparse
import json
import sys
from datetime import date, datetime
from pathlib import Path

from fpdf import FPDF

sys.path.insert(0, str(Path(__file__).resolve().parent))
from calculate_progress import calculate_progress  # noqa: E402  (Tarefa 12)

STATUS_LABELS = {"todo": "A fazer", "in_progress": "Em andamento", "completed": "Concluída"}


def to_latin1(text) -> str:
    """Core PDF fonts are Latin-1: keep accents, replace anything outside it."""
    value = "" if text is None else str(text)
    value = value.replace("–", "-").replace("—", "-").replace("•", "-")
    value = value.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    return value.encode("latin-1", "replace").decode("latin-1")


def format_date(iso: str) -> str:
    try:
        return datetime.strptime(iso[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
    except (TypeError, ValueError):
        return "-"


def load_export(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("format") != "edutrack-user-export":
        raise ValueError("Arquivo não é uma exportação do EduTrack (campo 'format').")
    return data


def summarize(data: dict) -> tuple[list[dict], dict, list[dict]]:
    """Per-subject progress (completed / total tasks), overall progress and pending tasks."""
    tasks = data.get("tasks", [])
    rows = []
    for subject in data.get("subjects", []):
        own = [t for t in tasks if t.get("subject_id") == subject.get("id")]
        done = sum(1 for t in own if t.get("status") == "completed")
        rows.append({**subject, **calculate_progress(done, len(own))})
    rows.sort(key=lambda r: str(r.get("code", "")))

    total_done = sum(1 for t in tasks if t.get("status") == "completed")
    overall = calculate_progress(total_done, len(tasks))

    pending = [t for t in tasks if t.get("status") != "completed"]
    pending.sort(key=lambda t: t.get("due_date") or "9999-12-31")
    return rows, overall, pending


class Report(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, to_latin1(f"EduTrack AI - página {self.page_no()}"), align="C")


def build_pdf(data: dict, output: Path) -> None:
    student = data.get("student", {})
    rows, overall, pending = summarize(data)

    pdf = Report(format="A4")
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(76, 29, 149)
    pdf.cell(0, 10, to_latin1("Relatório de Progresso Acadêmico"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(60, 60, 60)
    info = [
        f"Aluno: {student.get('name') or '(nome não informado no perfil)'}",
        f"Instituição: {student.get('institution', '-')}"
        + (f"  |  Curso: {student['course']}" if student.get("course") else "")
        + (f"  |  Semestre: {student['semester']}" if student.get("semester") else ""),
        f"Dados exportados do EduTrack AI em {format_date(data.get('exported_at', ''))}"
        f"  |  Relatório gerado em {date.today().strftime('%d/%m/%Y')}",
    ]
    for line in info:
        pdf.cell(0, 6, to_latin1(line), new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(20, 20, 20)
    pdf.cell(0, 8, to_latin1("Resumo"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(
        0, 6,
        to_latin1(
            f"{len(rows)} disciplinas  |  {overall['total']} tarefas  |  "
            f"{overall['completed']} concluídas  |  progresso geral {overall['percentage']:.0f}%"
        ),
        new_x="LMARGIN", new_y="NEXT",
    )

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, to_latin1("Progresso por disciplina"), new_x="LMARGIN", new_y="NEXT")
    widths = (24, 92, 24, 18, 22)
    headers = ("Código", "Disciplina", "Concluídas", "Total", "Progresso")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(237, 233, 254)
    for w, h in zip(widths, headers):
        pdf.cell(w, 7, to_latin1(h), border=1, fill=True)
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    for r in rows:
        name = to_latin1(r.get("name", ""))
        if len(name) > 52:
            name = name[:51] + "..."
        cells = (r.get("code", ""), name, r["completed"], r["total"], f"{r['percentage']:.0f}%")
        for w, value in zip(widths, cells):
            pdf.cell(w, 7, to_latin1(value), border=1)
        pdf.ln()

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, to_latin1(f"Tarefas pendentes ({len(pending)})"), new_x="LMARGIN", new_y="NEXT")
    if not pending:
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, to_latin1("Nenhuma tarefa pendente."), new_x="LMARGIN", new_y="NEXT")
    else:
        widths = (22, 86, 46, 26)
        headers = ("Prazo", "Tarefa", "Disciplina", "Status")
        pdf.set_font("Helvetica", "B", 9)
        for w, h in zip(widths, headers):
            pdf.cell(w, 7, to_latin1(h), border=1, fill=True)
        pdf.ln()
        pdf.set_font("Helvetica", "", 8)
        for t in pending:
            title = to_latin1(t.get("title", ""))
            subject = to_latin1(t.get("subject_name", ""))
            cells = (
                format_date(t.get("due_date", "")),
                title[:58] + ("..." if len(title) > 58 else ""),
                subject[:30] + ("..." if len(subject) > 30 else ""),
                STATUS_LABELS.get(t.get("status"), t.get("status", "")),
            )
            for w, value in zip(widths, cells):
                pdf.cell(w, 6, to_latin1(value), border=1)
            pdf.ln()

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(110, 110, 110)
    pdf.multi_cell(
        0, 4,
        to_latin1(
            "Progresso = tarefas concluídas / total de tarefas da disciplina "
            "(scripts/calculate_progress.py). Fonte: exportação dos dados do próprio aluno no EduTrack AI "
            "(Supabase, acesso restrito ao usuário por RLS)."
        ),
    )

    output.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(output))


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera o relatório de progresso em PDF a partir da exportação do EduTrack.")
    parser.add_argument("--input", required=True, type=Path, help="JSON baixado em Cockpit > Exportar dados")
    parser.add_argument("--output", required=True, type=Path, help="Caminho do PDF a gerar")
    args = parser.parse_args()

    data = load_export(args.input)
    build_pdf(data, args.output)
    rows, overall, pending = summarize(data)
    print(f"Relatório gerado: {args.output}")
    print(f"Disciplinas: {len(rows)} | Tarefas: {overall['total']} | Concluídas: {overall['completed']} "
          f"| Progresso geral: {overall['percentage']:.0f}% | Pendentes: {len(pending)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
