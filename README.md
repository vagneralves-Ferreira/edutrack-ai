# EduTrack AI

Projeto da disciplina **Innovation Lab: Desenvolvimento Avançado No/Low Code** – Faculdade Impacta (2025/2026).

Plataforma web de gestão acadêmica inteligente em **Bento Grid**, com sincronização em nuvem via **Supabase**, copiloto de estudos com **Gemini AI**, integração com **Google Classroom**, modo Claro/Escuro responsivo e exportação de relatório acadêmico em **PDF**.

## 🚀 Tecnologias Utilizadas

> Conforme autorizado pelo professor, o **Supabase substitui o Xano** e o front-end **React + Vite substitui o FlutterFlow**.

- **React + TypeScript + Tailwind CSS** — Interface responsiva em Bento Grid com Light/Dark Mode (no lugar do FlutterFlow)
- **Vite** — Build e servidor de desenvolvimento do front-end (Node.js)
- **Supabase (PostgreSQL + API REST + Auth + RLS + Edge Functions)** — Banco de dados, API REST gerada automaticamente, autenticação, políticas de segurança por `user_id` (no lugar do Xano)
- **Google Classroom API** — Importação de turmas e atividades do Classroom (`classroom.googleapis.com/v1`)
- **Google OAuth 2.0 (Google Identity Services)** — Login com Google para autorizar a leitura do Classroom, com escopos somente leitura
- **Gemini** — Dicas de estudo e assistente de IA, via Edge Function `ai-dicas` do Supabase
- **Vercel** — Deploy contínuo: preview por branch e produção a partir da `main`
- **Git & GitHub** — Versionamento com branches (`feat/`, `fix/`, `docs/`) e Pull Requests
- **OpenSpec** — Spec-Driven Development (`AGENTS.md`, `openspec/project.md`, `openspec/specs/` e `openspec/changes/archive/`)
- **Python 3** — Scripts de cálculo de progresso, busca híbrida e relatório de progresso em PDF (`scripts/`)
- **VS Code** — Ambiente principal de desenvolvimento

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
