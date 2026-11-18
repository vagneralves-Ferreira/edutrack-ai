# subjects Specification

## Purpose
Permitir que cada aluno mantenha a grade de disciplinas do semestre (código, nome, professores, carga horária, horário, descrição e tópicos) em `public.subjects`, base do Cockpit, do Kanban e do relatório de progresso.

## Requirements

### Requirement: Adicionar Nova Disciplina
O sistema SHALL permitir cadastrar uma nova disciplina pelo botão "Nova Disciplina" e SHALL gravá-la em `public.subjects` com o `user_id` do aluno autenticado.

#### Scenario: Clicar no botao
- **WHEN** o usuário clica em "Nova Disciplina"
- **THEN** o sistema abre o formulário de cadastro da disciplina

#### Scenario: Salvar disciplina
- **WHEN** o usuário preenche código e nome e confirma o cadastro
- **THEN** a disciplina aparece na grade e é salva em `public.subjects` com o seu `user_id`
