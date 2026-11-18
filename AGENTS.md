# Instruções para Agentes de IA - EduTrack AI

## Perfil do Projeto
Este é o projeto **EduTrack AI**, um aplicativo de gestão acadêmica inteligente.
- **Frontend:** React + TypeScript + Vite + Tailwind CSS (substitui o FlutterFlow, conforme autorizado pelo professor)
- **Backend:** Supabase – PostgreSQL, API REST, Auth e RLS (substitui o Xano, conforme autorizado pelo professor)
- **Integrações:** Google Classroom API (OAuth 2.0, escopos somente leitura) e Gemini (Edge Function `ai-dicas`)
- **Scripts:** Python 3 em `scripts/`
- **Deploy:** Vercel (preview por branch, produção a partir da `main`)
- **Metodologia:** Spec-Driven Development (OpenSpec) – contexto em `openspec/project.md`
- **IA Assistente:** Gemini / Antigravity Agent

## ⛔ REGRA Nº 1 - ESCOPO DE TAREFAS (OBRIGATÓRIO)
O arquivo `tasks.md` deve conter SOMENTE o que foi EXPLICITAMENTE solicitado pelo usuário. Não crie rotas, componentes ou APIs adicionais não pedidas.

## ⛔ REGRA Nº 2 - NÃO FAÇA DEPLOY AUTOMÁTICO
Sua responsabilidade termina na geração dos arquivos de especificação e documentação. Não tente executar scripts de deploy sem solicitação explícita.

## ⛔ REGRA Nº 3 - PRIORIDADE DE INSTRUÇÕES
1. Estas instruções (`AGENTS.md` da raiz)
2. Pedido explícito do usuário
3. Especificações em `openspec/AGENTS.md`

## ⛔ REGRA Nº 4 - SEGREDOS
Nunca grave nem exiba em código, commits, specs ou prints: arquivos `.env*`, chave `service_role` do Supabase, Client Secret do Google, tokens de acesso ou valores de variáveis da Vercel. No navegador use somente a chave pública (anon) via `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Customizações e Padrões do EduTrack AI
1. **Língua:** Código e variáveis sempre em INGLÊS; textos da interface em português (pt-BR).
2. **Banco de Dados:** Use `snake_case` (ex: `academic_tasks`, `user_id`). Colunas já existentes em português (`nome`, `codigo`, `titulo`) são mantidas.
3. **Migrations:** Toda mudança de schema vira um arquivo em `supabase/migrations/` e é refletida em `schema.sql`.
4. **Branches Git:** Use `feat/`, `fix/`, `docs/`. Mudanças chegam à `main` por Pull Request.
5. **Commits:** Siga Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
6. **Segurança (RLS):** Toda query ou política de acesso DEVE filtrar por `user_id` do usuário autenticado.

## Estrutura Principal
- `src/views/` telas · `src/components/` componentes · `src/context/` estado e dados (Supabase) · `src/services/` Google/Classroom · `src/lib/supabase.ts` cliente Supabase
- `schema.sql` e `supabase/migrations/` banco e RLS · `supabase/functions/` Edge Functions
- `scripts/` Python · `openspec/` specs e propostas

## CHECKLIST de Validação OpenSpec
- Estrutura de deltas em proposal: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`.
- Toda exigência deve ter pelo menos um cenário `#### Scenario:` com `- **WHEN**` e `- **THEN**`.
- As propostas finalizadas devem ser movidas para `openspec/changes/archive/<id>/`.
