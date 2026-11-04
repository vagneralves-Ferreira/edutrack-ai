import json
import sys

def hybrid_search(query: str, subjects_data: list) -> list:
    """
    Realiza busca híbrida em disciplinas por termo no nome/código
    ou por verificação de tarefas pendentes/atrasadas.
    """
    query_clean = query.strip().lower()
    results = []

    for subject in subjects_data:
        name_match = query_clean in subject.get("name", "").lower()
        code_match = query_clean in subject.get("code", "").lower()
        has_overdue = subject.get("has_overdue_tasks", False) and query_clean in ["atrasadas", "overdue", "pendentes"]

        if name_match or code_match or has_overdue:
            results.append({
                "id": subject.get("id"),
                "code": subject.get("code"),
                "name": subject.get("name"),
                "has_overdue_tasks": subject.get("has_overdue_tasks", False),
                "relevance_score": 1.0 if (name_match or code_match) else 0.8
            })

    return results

if __name__ == "__main__":
    search_term = sys.argv[1] if len(sys.argv) > 1 else "Software"

    mock_db = [
        {"id": "1", "code": "IMP-SQL101", "name": "SQL Fundamentals", "has_overdue_tasks": False},
        {"id": "2", "code": "IMP-ENG201", "name": "Software Engineering", "has_overdue_tasks": True},
        {"id": "3", "code": "IMP-ALG102", "name": "Programming & Algorithms", "has_overdue_tasks": True},
        {"id": "4", "code": "IMP-DBD202", "name": "Database Design", "has_overdue_tasks": False}
    ]

    matches = hybrid_search(search_term, mock_db)
    print(json.dumps({"query": search_term, "count": len(matches), "results": matches}, indent=2))
