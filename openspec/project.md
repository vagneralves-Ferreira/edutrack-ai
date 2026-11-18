# Project Context – EduTrack AI

## Purpose
EduTrack AI is a web academic planner for college students: subjects, tasks with deadlines (Kanban), a Pomodoro timer, an AI study assistant, Google Classroom import and a printable progress report. Built for the course *Innovation Lab: Desenvolvimento Avançado No/Low Code* (Faculdade Impacta).

As authorized by the professor, **Supabase replaces Xano** (database, REST API, RLS, Auth) and the **React + Vite front-end replaces FlutterFlow**.

## Tech Stack
- **Front-end:** React 19 + TypeScript, Vite, Tailwind CSS, `react-router-dom` (HashRouter), `lucide-react` icons.
- **Backend (BaaS):** Supabase – PostgreSQL, auto-generated REST API (PostgREST), Row Level Security, Auth (e-mail/password, password recovery).
- **Edge Function:** `supabase/functions/ai-dicas` (Deno) calling the Gemini API (`gemini-2.5-flash`, fallback `gemini-2.0-flash`).
- **Google integration:** Google Identity Services (OAuth 2.0 token model, read-only Classroom scopes) + Google Classroom API v1.
- **Scripts:** Python 3 in `scripts/` (progress calculation, hybrid search, PDF report).
- **Hosting:** Vercel (preview per branch, production on `main`).

## Project Structure
- `src/views/` – screens (Login, Register, ResetPassword, Dashboard/Cockpit, Subjects, Tasks/Kanban, Timer, AiAssistant).
- `src/components/` – UI components (dashboard cards, layout, Classroom modal, task modal).
- `src/context/` – `AuthContext`, `PlannerContext` (Supabase data), `ThemeContext`, `TimerContext`.
- `src/services/` – Google auth, Classroom import/sync, ignored courses.
- `src/lib/supabase.ts` – Supabase client (URL and anon key from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
- `schema.sql` – full schema (`profiles`, `subjects`, `tasks`, `classroom_ignored_courses`) and RLS policies.
- `supabase/migrations/` – incremental SQL migrations.
- `tables/` – SQL/XanoScript specs kept from the course tasks (`academic_tasks`, subjects CRUD policies).
- `openspec/` – specs (`specs/`) and archived change proposals (`changes/archive/`).

## Conventions
- Code, identifiers and commit messages in **English**; UI text in **Portuguese (pt-BR)**.
- Database names in `snake_case`; existing columns keep their Portuguese names (`nome`, `codigo`, `titulo`, `data_entrega`).
- Every query and policy is scoped to the authenticated user's `user_id` (RLS + explicit `.eq('user_id', …)`).
- Git: branches `feat/`, `fix/`, `docs/`; Conventional Commits; changes reach `main` through Pull Requests.
- Schema changes: new file in `supabase/migrations/` **and** the same change reflected in `schema.sql`.
- Secrets never go to the repository or to screenshots: `.env*` is git-ignored; only the public anon key is used in the browser; the `service_role` key is never used by the front-end.

## Domain Notes
- A **subject** (`subjects`) belongs to one user and has code, name, professor, workload, schedule, description and topics.
- A **task** (`tasks`) belongs to one user and one subject; status `todo` / `in_progress` / `completed`; priority; optional `classroom_id` for imported Classroom work (unique per user).
- Subject progress = completed tasks ÷ total tasks of the subject (`scripts/calculate_progress.py`).
