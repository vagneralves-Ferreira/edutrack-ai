import json
import os

DATA_FILE = "scripts/subjects_db.json"

def _load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def create_subject(user_id, name, code):
    data = _load_data()
    new_id = len(data) + 1
    subject = {"id": new_id, "user_id": user_id, "name": name, "code": code}
    data.append(subject)
    _save_data(data)
    return subject

def list_subjects(user_id):
    data = _load_data()
    return [s for s in data if s.get("user_id") == user_id]

def update_subject(user_id, subject_id, name=None, code=None):
    data = _load_data()
    for s in data:
        if s["id"] == subject_id and s["user_id"] == user_id:
            if name: s["name"] = name
            if code: s["code"] = code
            _save_data(data)
            return s
    return None

def delete_subject(user_id, subject_id):
    data = _load_data()
    filtered = [s for s in data if not (s["id"] == subject_id and s["user_id"] == user_id)]
    if len(filtered) < len(data):
        _save_data(filtered)
        return True
    return False

if __name__ == "__main__":
    # Teste isolado por utilizador
    create_subject(user_id=1, name="Matemática", code="MAT101")
    create_subject(user_id=2, name="História", code="HIS101")
    
    print("Disciplinas do Usuário 1:", json.dumps(list_subjects(user_id=1), indent=2))
    print("Disciplinas do Usuário 2:", json.dumps(list_subjects(user_id=2), indent=2))
