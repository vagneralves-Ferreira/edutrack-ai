import json
import os

DATA_FILE = "scripts/subjects_db.json"

def _load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def search_subjects(user_id, query=""):
    data = _load_data()
    # Filtra primeiro pelo utilizador
    user_subjects = [s for s in data if s.get("user_id") == user_id]
    
    if not query:
        return user_subjects
        
    q = query.lower()
    # Pesquisa flexível no nome ou código
    results = [
        s for s in user_subjects 
        if q in s.get("name", "").lower() or q in s.get("code", "").lower()
    ]
    return results

if __name__ == "__main__":
    # Testes de busca avançada
    print("Busca por 'mat' (Utilizador 1):", json.dumps(search_subjects(user_id=1, query="mat"), indent=2))
    print("Busca por 'HIS' (Utilizador 1 - deve retornar vazio):", json.dumps(search_subjects(user_id=1, query="HIS"), indent=2))
    print("Busca por 'HIS' (Utilizador 2):", json.dumps(search_subjects(user_id=2, query="HIS"), indent=2))
