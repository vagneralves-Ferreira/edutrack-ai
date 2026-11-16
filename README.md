# EduTrack AI

Projeto da disciplina **Innovation Lab: Desenvolvimento Avançado No/Low Code** – Faculdade Impacta (2025/2026).

Plataforma web de gestão acadêmica inteligente em **Bento Grid**, com sincronização em nuvem via **Supabase**, copiloto de estudos com **Gemini AI**, integração com **Google Classroom**, modo Claro/Escuro responsivo e exportação de relatório acadêmico em **PDF**.

## 🚀 Tecnologias Utilizadas

- **Git & GitHub** — Versionamento com branches (`feat/`, `fix/`, `docs/`) e Pull Requests
- **VS Code** — Ambiente principal de desenvolvimento
- **Node.js & Vite** — Build e ambiente de execução frontend
- **React + TypeScript + Tailwind CSS** — Interface responsiva em Bento Grid com Light/Dark Mode
- **Supabase (PostgreSQL + Auth + RLS + Edge Functions)** — Banco de dados, autenticação JWT, políticas de segurança por `user_id` e Edge Function `ai-dicas` (Gemini AI)
- **OpenSpec** — Spec-Driven Development (`AGENTS.md`, `openspec/specs/` e `openspec/changes/archive/`)
- **Python 3** — Scripts auxiliares de cálculo de progresso, busca híbrida e geração de relatórios (`scripts/`)
- **Vercel** — Deploy contínuo em produção

## 📁 Estrutura Principal do Projeto

- `src/views/` — Telas principais (`LoginView`, `RegisterView`, `ResetPasswordView`, `DashboardView`, `SubjectsView`, `TasksView`, `TimerView`, `AiAssistantView`)
- `src/context/` — Contextos globais (`AuthContext`, `PlannerContext`, `ThemeContext`, `TimerContext`)
- `src/services/classroomSync.ts` — Integração e sincronização com Google Classroom
- `src/utils/reportGenerator.ts` — Exportação de relatório acadêmico em PDF na web
- `supabase/functions/ai-dicas/` — Edge Function integrada ao Gemini AI
- `tables/` & `schema.sql` — Modelagem SQL e políticas RLS
- `scripts/` — Scripts Python (`calculate_progress.py`, `search_subjects.py`, `generate_pdf_report.py`)
- `openspec/` — Especificações e histórico de propostas arquivadas
- `docs/` — Documentação de arquitetura, design system, referências e auditoria

## ⚙️ Como Executar Localmente

```bash
npm install
npm run dev
```

Para validar o build de produção:

```bash
npm run build
```
