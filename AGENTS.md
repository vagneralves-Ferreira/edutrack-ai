# AGENTS.md – Regras e Diretrizes do Projeto EduTrack AI

## Contexto e Arquitetura do Projeto
- **Projeto:** EduTrack AI – Planejador Acadêmico Inteligente
- **Frontend:** React (TypeScript + Tailwind CSS) com ícones Lucide React
- **Backend:** Supabase (PostgreSQL BaaS + Auth + RLS)
- **Metodologia:** Spec-Driven Development (OpenSpec)
- **Formato de specs:** Utilizar deltas (`## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`)

## Convenções de Especificação (OpenSpec)
1. Toda nova funcionalidade ou tabela deve possuir uma proposta documentada em `openspec/changes/<change-name>/`.
2. Artefatos obrigatórios por mudança:
   - `proposal.md` (Why, What Changes, Impact)
   - `specs/spec.md` (Deltas com `### Requirement:` e `#### Scenario:`)
   - `tasks.md` (Checklist de implementação)
3. Após validação e conclusão das tarefas, a proposta deve ser arquivada em `openspec/changes/archive/`.
