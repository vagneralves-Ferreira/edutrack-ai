# subjects Specification

## Purpose
Define a estrutura e regras de negocio para as disciplinas do aluno.

## ADDED Requirements

### Requirement: Tabela de Disciplinas
O sistema SHALL armazenar as disciplinas vinculadas ao user_id autenticado.

#### Scenario: Criacao de disciplina
- WHEN o utilizador cadastra uma nova disciplina
- THEN o sistema regista com id, name, teacher, hours e user_id no Supabase.
