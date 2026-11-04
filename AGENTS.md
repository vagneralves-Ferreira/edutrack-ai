# Instruções para Agentes de IA - EduTrack AI

## Perfil do Projeto
Este é o projeto **EduTrack AI**, um aplicativo de gestão acadêmica inteligente.
- **Frontend:** React (TypeScript + Tailwind CSS)
- **Backend:** Supabase (PostgreSQL BaaS + Auth + RLS)
- **Metodologia:** Spec-Driven Development (OpenSpec)
- **IA Assistente:** Gemini / Antigravity Agent

## ⛔ REGRA Nº 1 - ESCOPO DE TAREFAS (OBRIGATÓRIO)
O arquivo `tasks.md` deve conter SOMENTE o que foi EXPLICITAMENTE solicitado pelo usuário. Não crie rotas, componentes ou APIs adicionais não pedidas.

## ⛔ REGRA Nº 2 - NÃO FAÇA DEPLOY AUTOMÁTICO
Sua responsabilidade termina na geração dos arquivos de especificação e documentação. Não tente executar scripts de deploy sem solicitação explícita.

## ⛔ REGRA Nº 3 - PRIORIDADE DE INSTRUÇÕES
1. Estas instruções (`AGENTS.md` da raiz)
2. Pedido explícito do usuário
3. Especificações em `openspec/AGENTS.md`

## Customizações e Padrões do EduTrack AI
1. **Língua:** Código e variáveis sempre em INGLÊS.
2. **Banco de Dados:** Use `snake_case` (ex: `academic_tasks`, `user_id`).
3. **Branches Git:** Use `feat/`, `fix/`, `docs/`.
4. **Commits:** Siga Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
5. **Segurança (RLS):** Toda query ou política de acesso DEVE filtrar por `user_id` do usuário autenticado.

## CHECKLIST de Validação OpenSpec
- Estrutura de deltas em proposal: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`.
- Toda exigência deve ter pelo menos um cenário `#### Scenario:` com `- **WHEN**` e `- **THEN**`.
- As propostas finalizadas devem ser movidas para `openspec/changes/archive/<id>/`.
