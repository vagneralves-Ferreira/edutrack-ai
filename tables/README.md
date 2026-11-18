# tables/

Definições de tabelas e policies usadas nas tarefas do curso. A fonte completa do banco é `schema.sql` (raiz), com as mudanças incrementais em `supabase/migrations/`.

| Arquivo | Conteúdo | Situação no banco (Supabase) |
|---|---|---|
| `tasks.sql` | Tabela `public.tasks` + índices + 4 policies RLS (`tasks_*_own`) | Igual a `schema.sql`; tabela e número de colunas (11) conferidos no painel do Supabase em 18/11/2026 (Tarefa 11) |
| `subjects_crud_api.sql` | RLS de `public.subjects` (`subjects_*_own`) e o mapeamento CRUD → endpoints REST | Igual a `schema.sql`; nomes das policies a conferir no print de Policies do painel (Tarefa 13) |
| `academic_tasks.xs` | Esboço em XanoScript da fase Xano (Tarefa 04, commit `e8c431f`) | **Não aplicado**: o Xano foi substituído pelo Supabase, e a tabela real é `public.tasks` |
