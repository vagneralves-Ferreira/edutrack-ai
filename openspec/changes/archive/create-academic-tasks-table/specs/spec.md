# academic_tasks Specification

## Purpose
Define o esquema de dados e regras de integridade para tarefas academicas.

## ADDED Requirements

### Requirement: Tabela de Tarefas Academicas
O sistema SHALL armazenar tarefas vinculadas ao user_id e opcionalmente a uma subject_id.

#### Scenario: Registo de nova tarefa
- **WHEN** o utilizador submete uma nova tarefa
- **THEN** o sistema regista title, description, due_date, status, subject_id e user_id no Supabase.
