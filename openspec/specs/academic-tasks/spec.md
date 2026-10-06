# academic-tasks Specification

## Purpose
TBD - created by archiving change create-academic-tasks-table. Update Purpose after archive.

## Requirements

### Requirement: Tabela de Tarefas Acadêmicas

A tabela `academic_tasks` armazena tarefas acadêmicas com disciplina, título, descrição, data de entrega, status e prioridade.

#### Scenario: Criar nova tarefa

- **WHEN** uma nova tarefa é cadastrada com disciplina, título e data de entrega válidos
- **THEN** a tarefa é salva na tabela `academic_tasks` com status pendente

#### Scenario: Buscar tarefas por disciplina

- **WHEN** o usuário busca tarefas informando uma disciplina
- **THEN** o sistema retorna todas as tarefas daquela disciplina ordenadas por data de entrega

#### Scenario: Calcular progresso

- **WHEN** o usuário consulta o progresso acadêmico
- **THEN** o sistema calcula a porcentagem de tarefas concluídas sobre o total
