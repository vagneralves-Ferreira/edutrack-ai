import json
import sys
import os

def generate_academic_report(student_name: str, subjects_summary: list) -> dict:
    """
    Gera o resumo estruturado e o layout em formato de documento de relatório acadêmico em PDF.
    """
    total_subjects = len(subjects_summary)
    completed_tasks_total = sum(s.get("completed", 0) for s in subjects_summary)
    total_tasks_overall = sum(s.get("total", 0) for s in subjects_summary)
    
    overall_percentage = round((completed_tasks_total / total_tasks_overall * 100), 2) if total_tasks_overall > 0 else 0.0

    report_data = {
        "title": "Relatorio de Desempenho Academico - EduTrack AI",
        "student": student_name,
        "metrics": {
            "total_subjects": total_subjects,
            "completed_tasks": completed_tasks_total,
            "total_tasks": total_tasks_overall,
            "overall_progress_percentage": overall_percentage
        },
        "subjects_detail": subjects_summary
    }

    report_path = os.path.join("docs", "reports", "relatorio_desempenho.pdf.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    return report_data

if __name__ == "__main__":
    student = sys.argv[1] if len(sys.argv) > 1 else "Aluno EduTrack AI"
    
    sample_data = [
        {"code": "IMP-SQL101", "name": "SQL Fundamentals", "completed": 5, "total": 5, "progress": 100.0},
        {"code": "IMP-ENG201", "name": "Software Engineering", "completed": 4, "total": 5, "progress": 80.0},
        {"code": "IMP-ALG102", "name": "Programming & Algorithms", "completed": 2, "total": 4, "progress": 50.0}
    ]

    result = generate_academic_report(student, sample_data)
    print(json.dumps(result, indent=2))
