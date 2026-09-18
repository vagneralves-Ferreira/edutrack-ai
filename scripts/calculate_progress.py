import json

def calculate_progress(completed_tasks, total_tasks):
    if total_tasks <= 0:
        progress = 0.0
    else:
        progress = round((completed_tasks / total_tasks) * 100, 2)
    
    return {
        "completed": completed_tasks,
        "total": total_tasks,
        "progress_percentage": progress
    }

if __name__ == "__main__":
    resultado = calculate_progress(completed_tasks=3, total_tasks=5)
    print(json.dumps(resultado, indent=2))
