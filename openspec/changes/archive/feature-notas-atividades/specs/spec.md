# activity-grades Specification

## Purpose
Especificar o schema e regras de negocio para notas de atividades.

## ADDED Requirements

### Requirement: Lancamento de Nota
O sistema SHALL armazenar a nota atribuida a uma tarefa filtrada por user_id.

#### Scenario: Professor ou Aluno regista nota
- **WHEN** uma nota e introduzida para uma atividade
- **THEN** o sistema guarda o valor numérico e associa ao user_id no Supabase.
