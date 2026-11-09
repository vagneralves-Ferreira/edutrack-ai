import json
import sys

def calculate_progress(completed_tasks: int, total_tasks: int) -> dict:
    """
    Calcula a percentagem de progresso de tarefas concluídas.
    Trata divisão por zero se total_tasks for 0.
    """
    if total_tasks <= 0:
        percentage = 0.0
    else:
        percentage = round((completed_tasks / total_tasks) * 100, 2)
    
    return {
        "completed": completed_tasks,
        "total": total_tasks,
        "percentage": percentage
    }

if __name__ == "__main__":
    # Teste de execução via CLI / Argumentos ou padrão
    try:
        completed = int(sys.argv[1]) if len(sys.argv) > 1 else 3
        total = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    except ValueError:
        completed, total = 0, 0

    result = calculate_progress(completed, total)
    print(json.dumps(result, indent=2))
