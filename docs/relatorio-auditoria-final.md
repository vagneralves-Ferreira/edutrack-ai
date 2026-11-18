# Relatório de Auditoria — EduTrack AI

**Projeto:** EduTrack AI
**Data da auditoria:** 18/11/2026 (revisão que substitui a versão de 15/11/2026)
**Escopo:** Tarefas 01 a 16 do Innovation Lab, verificadas no repositório, no GitHub, no Supabase e na Vercel.
**Stack:** conforme autorizado pelo professor, Supabase substitui o Xano e React + Vite substitui o FlutterFlow.

**Resultado geral:** a maior parte das tarefas está atendida, várias com ressalvas registradas abaixo. Ainda há itens pendentes (prints de painel e textos do aluno). Esta revisão retira o "100% aprovado" da versão anterior, que não refletia o estado real.

Legenda: **Atendida** · **Atendida com ressalva** · **Pendente**

## 1. Status por tarefa

| Tarefa | Status | Evidência | Ressalva / pendência |
|---|---|---|---|
| 01 – Git e GitHub | Atendida com ressalva | Repositório público, `README.md`, primeiro commit `9e61794` | O primeiro commit não está na `main` atual (histórico reescrito); existe no GitHub pelo PR #1. A mensagem não é a sugerida no enunciado. |
| 02 – VS Code, Node.js e IA | Pendente | Node.js/npm no terminal; VS Code com o projeto | A extensão Gemini Code Assist não está instalada nesta máquina; falta o print com o Gemini. |
| 03 – OpenSpec | Atendida com ressalva | `openspec/` (commit `de62d0f`), `AGENTS.md`, `openspec/project.md`, `openspec/AGENTS.md` | A versão do OpenSpec usada gera `config.yaml`; `project.md` e `openspec/AGENTS.md` foram escritos depois (PR #6). |
| 04 – Backend como código | Atendida com ressalva | `schema.sql`, `supabase/migrations/`, `tables/` | Supabase no lugar do Xano. O `tables/academic_tasks.xs` é um esboço da fase Xano, nunca aplicado; não houve pull/push com o Xano. |
| 05 – Branches e Pull Requests | Atendida com ressalva | PRs #1 a #6 mergeados; README "Tecnologias Utilizadas" | O PR #1 tem um único commit sem alterações de arquivo; a seção do README entrou direto na `main` e foi completada pelo PR #6. |
| 06 – Referências | Atendida | `docs/pesquisa/referencias.md` (com "Principal Sacada") | — |
| 07 – Front-end | Atendida (substituição autorizada) | App React na Vercel, `src/lib/supabase.ts`, `vercel ls`/`vercel inspect` | — |
| 08 – Primeira proposta OpenSpec | Atendida | `openspec/changes/archive/create-subjects-table/` | Tabela `subjects` criada no Supabase, não no Xano. |
| 09 – Páginas e Design System | Atendida com ressalva | 5 páginas com navegação; `src/index.css`; `docs/integracao-design-assets.md` | A pasta `assets/` está vazia; os assets reais estão em `public/`. Não houve exportação do Figma. |
| 10 – `AGENTS.md` avançado | Atendida com ressalva | `AGENTS.md` com schema, segurança, comunicação e checklist OpenSpec; proposta arquivada `2026-11-18-update-agents-md-project-rules` | Falta o print da IA confirmando as regras. |
| 11 – Tabela de tarefas | Atendida com ressalva | `public.tasks` em `schema.sql` e `tables/tasks.sql`; proposta `create-academic-tasks-table` | Especificada como `academic_tasks`; o nome real é `tasks` (equivalência no README). Falta o print das colunas no painel. |
| 12 – Python: progresso | Atendida | `scripts/calculate_progress.py` (trata divisão por zero) | — |
| 13 – CRUD com RLS | Atendida com ressalva | Policies `subjects_*_own` em `schema.sql` e `tables/subjects_crud_api.sql`; Data API Docs do Supabase | Falta o print das policies de `subjects` no painel. |
| 14 – Busca avançada | Atendida com ressalva | `scripts/search_subjects.py` lê o Supabase (REST + RLS) ou a exportação do app; busca "atrasadas" | Sem o token de sessão do usuário o RLS não devolve linhas; o teste com dados reais usa a exportação do app. Não houve PR específico na época. |
| 15 – Relatório em PDF | Atendida | `scripts/generate_pdf_report.py` e `scripts/generate_progress_report.py` geram PDF real (fpdf2); botão "Relatório PDF" no app | — |
| 16 – Auditoria e entrega final | Pendente | Este relatório; app em produção | Falta o PR de entrega final e o texto do aluno sobre o OpenSpec. |

## 2. Verificações técnicas (18/11/2026)
- **Build:** `npm run build` (`tsc -b && vite build`) concluído sem erros.
- **OpenSpec:** `openspec validate --all` → 3 specs válidas, **sem avisos** (os avisos de Purpose provisório e de requisitos sem SHALL/MUST foram corrigidos).
- **Banco x repositório:** tabelas e número de colunas conferidos no painel do Supabase (`classroom_ignored_courses` 5, `profiles` 5, `subjects` 10, `tasks` 11), iguais a `schema.sql`.
- **Isolamento de dados (RLS):** policies `<tabela>_*_own` com `auth.uid() = user_id` (ou `= id` em `profiles`). Uma leitura real da API REST sem token de usuário devolveu 0 linhas.
- **Produção:** o commit da `main` e o deploy de produção da Vercel eram o mesmo (`ecce216`) na verificação de 18/11.

## 3. Melhorias incorporadas no período
- Importação real do Google Classroom (OAuth, escopos somente leitura) e gestão de disciplinas.
- Assistente com Gemini via Supabase Edge Function (`supabase/functions/ai-dicas`).
- Tema claro/escuro, telas de login, cadastro e senha revisadas, saudação pelo nome do perfil.
- Exportação dos dados do aluno (JSON) e relatórios PDF em Python com dados reais.
