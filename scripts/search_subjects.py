"""Hybrid subject search (Tarefa 14): database data (Supabase) + processing in Python.

Data sources:
  Supabase (default) - reads public.subjects and public.tasks through the REST API (PostgREST).
      Env vars: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY);
      optional SUPABASE_ACCESS_TOKEN = the signed-in user's session token. RLS only returns the rows of
      that user; without a user token the database returns no rows. The service_role key is never used.
  --input dados.json - the user's own export from the app (Cockpit > "Exportar dados").

Queries:
  "atrasadas" / "overdue"  -> subjects with at least one unfinished task whose due date has passed
  "pendentes" / "pending"  -> subjects with at least one unfinished task
  any other text           -> match on subject name or code

Usage:
    python scripts/search_subjects.py atrasadas
    python scripts/search_subjects.py SQL --input dados.json
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path

OVERDUE_TERMS = {"atrasadas", "atrasada", "overdue"}
PENDING_TERMS = {"pendentes", "pendente", "pending"}


def _parse_date(value) -> date | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
        except ValueError:
            return None


def build_subjects(subjects: list, tasks: list, today: date | None = None) -> list:
    """Adds pending/overdue counts to each subject (tasks use subject_id, status, due_date)."""
    today = today or date.today()
    result = []
    for s in subjects:
        own = [t for t in tasks if t.get("subject_id") == s.get("id")]
        unfinished = [t for t in own if t.get("status") != "completed"]
        overdue = [t for t in unfinished if (d := _parse_date(t.get("due_date"))) and d < today]
        result.append({
            "id": s.get("id"),
            "code": s.get("code", ""),
            "name": s.get("name", ""),
            "pending_tasks": len(unfinished),
            "overdue_tasks": len(overdue),
            "has_overdue_tasks": bool(overdue),
        })
    return result


def hybrid_search(query: str, subjects_data: list) -> list:
    """Busca híbrida: termo no nome/código ou filtro de tarefas atrasadas/pendentes."""
    q = query.strip().lower()
    results = []
    for s in subjects_data:
        if q in OVERDUE_TERMS:
            hit, score = s.get("has_overdue_tasks", False), 1.0
        elif q in PENDING_TERMS:
            hit, score = s.get("pending_tasks", 0) > 0, 1.0
        else:
            name_match = q in s.get("name", "").lower()
            code_match = q in s.get("code", "").lower()
            hit, score = (name_match or code_match), (1.0 if code_match or s.get("name", "").lower() == q else 0.8)
        if hit:
            results.append({**s, "relevance_score": score})
    results.sort(key=lambda r: (-r["relevance_score"], -r.get("overdue_tasks", 0), r.get("code", "")))
    return results


def _rest_get(base_url: str, anon_key: str, token: str, path: str) -> list:
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/rest/v1/{path}",
        headers={"apikey": anon_key, "Authorization": f"Bearer {token or anon_key}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_from_supabase() -> tuple[list, list, str]:
    base_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    anon_key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
    if not base_url or not anon_key:
        raise RuntimeError("Defina SUPABASE_URL e SUPABASE_ANON_KEY (ou use --input com a exportação do app).")
    subjects = _rest_get(base_url, anon_key, token, "subjects?select=id,codigo,nome")
    tasks = _rest_get(base_url, anon_key, token, "tasks?select=subject_id,status,data_entrega")
    subjects = [{"id": s["id"], "code": s.get("codigo", ""), "name": s.get("nome", "")} for s in subjects]
    tasks = [{"subject_id": t.get("subject_id"), "status": t.get("status"), "due_date": t.get("data_entrega")} for t in tasks]
    source = "Supabase (REST, " + ("token do usuário" if token else "sem token de usuário: o RLS não devolve linhas") + ")"
    return subjects, tasks, source


def load_from_export(path: Path) -> tuple[list, list, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("format") != "edutrack-user-export":
        raise ValueError("Arquivo não é uma exportação do EduTrack (campo 'format').")
    return data.get("subjects", []), data.get("tasks", []), f"exportação do app ({path.name})"


def main() -> int:
    parser = argparse.ArgumentParser(description="Busca híbrida de disciplinas (Supabase + Python).")
    parser.add_argument("query", nargs="?", default="atrasadas", help='termo, "atrasadas" ou "pendentes"')
    parser.add_argument("--input", type=Path, help="JSON baixado em Cockpit > Exportar dados")
    args = parser.parse_args()

    try:
        subjects, tasks, source = load_from_export(args.input) if args.input else load_from_supabase()
    except (urllib.error.URLError, RuntimeError, ValueError, OSError) as err:
        print(json.dumps({"error": str(err)}, ensure_ascii=False, indent=2))
        return 1

    matches = hybrid_search(args.query, build_subjects(subjects, tasks))
    print(json.dumps({"query": args.query, "source": source, "subjects_read": len(subjects),
                      "count": len(matches), "results": matches}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
