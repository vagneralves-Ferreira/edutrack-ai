import json
import os
from fpdf import FPDF

DATA_FILE = "scripts/subjects_db.json"

def load_subjects(user_id):
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [s for s in data if s.get("user_id") == user_id]

def generate_report(user_id, output_filename="relatorio_progresso.pdf"):
    subjects = load_subjects(user_id)
    
    pdf = FPDF()
    pdf.add_page()
    
    # Cabeçalho do Relatório
    pdf.set_font("Helvetica", 'B', 16)
    pdf.cell(0, 10, f"Relatorio de Progresso do Aluno (User ID: {user_id})", new_x="LMARGIN", new_y="NEXT", align='C')
    pdf.ln(10)
    
    # Cabeçalho da Tabela
    pdf.set_font("Helvetica", 'B', 12)
    pdf.cell(30, 10, "ID", border=1)
    pdf.cell(50, 10, "Codigo", border=1)
    pdf.cell(100, 10, "Disciplina", border=1)
    pdf.ln()
    
    # Dados das Disciplinas
    pdf.set_font("Helvetica", '', 12)
    if not subjects:
        pdf.cell(180, 10, "Nenhuma disciplina encontrada.", border=1, new_x="LMARGIN", new_y="NEXT")
    else:
        for s in subjects:
            pdf.cell(30, 10, str(s.get("id")), border=1)
            pdf.cell(50, 10, str(s.get("code")), border=1)
            pdf.cell(100, 10, str(s.get("name")), border=1)
            pdf.ln()
            
    pdf.output(output_filename)
    print(f"Relatorio PDF gerado com sucesso: {output_filename}")

if __name__ == "__main__":
    generate_report(user_id=1, output_filename="relatorio_user_1.pdf")
