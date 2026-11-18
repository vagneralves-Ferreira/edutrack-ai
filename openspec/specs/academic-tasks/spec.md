# academic-tasks Specification

## Purpose
Armazenar as tarefas acadêmicas de cada aluno (entregas, listas, provas e atividades importadas do Google Classroom) ligadas às suas disciplinas, para alimentar o Kanban, os prazos do Cockpit e o cálculo de progresso. A tabela real no Supabase é `public.tasks` (especificada inicialmente como `academic_tasks` na change `create-academic-tasks-table`).

## Requirements

### Requirement: Tabela de Tarefas Acadêmicas
O sistema SHALL armazenar cada tarefa na tabela `public.tasks` com `user_id`, `subject_id` (referência a `public.subjects`), `titulo`, `descricao`, `data_entrega`, `status` (`todo`, `in_progress` ou `completed`), `prioridade` e `importado_classroom`, e SHALL permitir a cada usuário ler e alterar apenas as próprias tarefas (RLS por `user_id`).

#### Scenario: Criar nova tarefa
- **WHEN** o aluno cadastra uma tarefa com disciplina, título e data de entrega válidos
- **THEN** a tarefa é salva em `public.tasks` com o `user_id` do aluno e status inicial `todo`

#### Scenario: Filtrar tarefas por disciplina
- **WHEN** o aluno escolhe uma disciplina no filtro do Kanban
- **THEN** o sistema mostra apenas as tarefas daquela disciplina

#### Scenario: Calcular progresso
- **WHEN** o aluno consulta o progresso de uma disciplina
- **THEN** o sistema calcula a porcentagem de tarefas concluídas sobre o total, retornando 0% quando não há tarefas

#### Scenario: Isolamento entre usuários
- **WHEN** um usuário autenticado consulta `public.tasks`
- **THEN** recebe somente as linhas cujo `user_id` é o seu
