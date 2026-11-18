"""Generate the academic performance report as a real PDF (fpdf2).

Data source:
  --input dados.json  -> the user's own export from the app (Cockpit > "Exportar dados"),
                         i.e. real Supabase data read through RLS. Recommended.
  (no --input)        -> a small built-in SAMPLE, clearly labeled as sample data in the PDF.

Usage:
    python scripts/generate_pdf_report.py --input dados.json [--output docs/reports/relatorio_desempenho.pdf]

Requires: fpdf2 (see scripts/requirements.txt)
"""

import argparse
import sys
from datetime import date
from pathlib import Path

from fpdf import FPDF

sys.path.insert(0, str(Path(__file__).resolve().parent))
from calculate_progress import calculate_progress  # noqa: E402  (Tarefa 12)
from generate_progress_report import load_export, summarize, to_latin1  # noqa: E402

DEFAULT_OUTPUT = Path("docs") / "reports" / "relatorio_desempenho.pdf"

SAMPLE_SUBJECTS = [
    {"code": "IMP-SQL101", "name": "SQL Fundamentals", "completed": 5, "total": 5},
    {"code": "IMP-ENG201", "name": "Software Engineering", "completed": 4, "total": 5},
    {"code": "IMP-ALG102", "name": "Programming & Algorithms", "completed": 2, "total": 4},
]


def generate_academic_report(student_name: str, subjects_summary: list, output: Path, is_sample: bool) -> dict:
    """Writes the performance PDF and returns the computed metrics."""
    completed = sum(s.get("completed", 0) for s in subjects_summary)
    total = sum(s.get("total", 0) for s in subjects_summary)
    overall = calculate_progress(completed, total)

    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(76, 29, 149)
    pdf.cell(0, 10, to_latin1("Relatório de Desempenho Acadêmico"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 6, to_latin1(f"Aluno: {student_name}"), new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, to_latin1(f"Gerado em {date.today().strftime('%d/%m/%Y')} pelo EduTrack AI"), new_x="LMARGIN", new_y="NEXT")
    if is_sample:
        pdf.set_text_color(180, 83, 9)
        pdf.cell(0, 6, to_latin1("ATENÇÃO: dados de EXEMPLO (rode com --input para usar os dados reais exportados)."),
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(60, 60, 60)

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(20, 20, 20)
    pdf.cell(0, 8, to_latin1("Métricas gerais"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    for label, value in (
        ("Disciplinas", len(subjects_summary)),
        ("Tarefas concluídas", f"{overall['completed']} de {overall['total']}"),
        ("Progresso geral", f"{overall['percentage']:.0f}%"),
    ):
        pdf.cell(60, 6, to_latin1(label), border=1)
        pdf.cell(60, 6, to_latin1(value), border=1, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, to_latin1("Desempenho por disciplina"), new_x="LMARGIN", new_y="NEXT")
    widths = (28, 96, 22, 18, 22)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(237, 233, 254)
    for w, h in zip(widths, ("Código", "Disciplina", "Concluídas", "Total", "Progresso")):
        pdf.cell(w, 7, to_latin1(h), border=1, fill=True)
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    for s in subjects_summary:
        p = calculate_progress(s.get("completed", 0), s.get("total", 0))
        name = to_latin1(s.get("name", ""))
        name = name if len(name) <= 54 else name[:53] + "..."
        for w, v in zip(widths, (s.get("code", ""), name, p["completed"], p["total"], f"{p['percentage']:.0f}%")):
            pdf.cell(w, 7, to_latin1(v), border=1)
        pdf.ln()

    output.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(output))
    return {"student": student_name, "subjects": len(subjects_summary), **overall, "output": str(output), "sample": is_sample}


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera o relatório de desempenho acadêmico em PDF.")
    parser.add_argument("--input", type=Path, help="JSON baixado em Cockpit > Exportar dados (dados reais)")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Caminho do PDF a gerar")
    args = parser.parse_args()

    if args.input:
        data = load_export(args.input)
        rows, _, _ = summarize(data)
        student = (data.get("student") or {}).get("name") or "(nome não informado no perfil)"
        summary = [{"code": r.get("code", ""), "name": r.get("name", ""), "completed": r["completed"], "total": r["total"]} for r in rows]
        result = generate_academic_report(student, summary, args.output, is_sample=False)
    else:
        result = generate_academic_report("Aluno EduTrack AI (exemplo)", SAMPLE_SUBJECTS, args.output, is_sample=True)

    print(f"PDF gerado: {result['output']}" + ("  [dados de EXEMPLO]" if result["sample"] else ""))
    print(f"Disciplinas: {result['subjects']} | Concluídas: {result['completed']} de {result['total']} | "
          f"Progresso geral: {result['percentage']:.0f}%")
    return 0


if __name__ == "__main__":
    sys.exit(main())
