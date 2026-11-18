# Proposal: Update AGENTS.md with the current project rules

## Why

The root `AGENTS.md` still described only the original stack and pointed to an `openspec/AGENTS.md` that did not exist. The professor authorized replacing Xano with Supabase and FlutterFlow with React + Vite, and the project gained integrations (Google Classroom, Gemini, Vercel) and practices (migrations, PR flow, no secrets) that AI assistants were not told about. This proposal records that change to the agent instructions (Tarefa 10); the edit itself was made in commit `fd6eed0` on branch `feat/delivery-pending-items`.

## What Changes

- **Project profile:** front-end React + TypeScript + Vite + Tailwind (replaces FlutterFlow); backend Supabase with PostgreSQL, REST API, Auth and RLS (replaces Xano); integrations Google Classroom API (OAuth 2.0, read-only scopes) and Gemini (Edge Function `ai-dicas`); Python scripts in `scripts/`; Vercel deploy; pointer to `openspec/project.md`.
- **New rule nº 4 – secrets:** never write or show `.env*`, Supabase `service_role` key, Google Client Secret, access tokens or Vercel variable values; the browser uses only the anon key via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- **Conventions:** UI text in pt-BR; existing Portuguese column names (`nome`, `codigo`, `titulo`) are kept; schema changes go to `supabase/migrations/` and are mirrored in `schema.sql`; changes reach `main` through Pull Requests.
- **Main structure** section listing `src/views`, `src/components`, `src/context`, `src/services`, `src/lib/supabase.ts`, `schema.sql`, `supabase/`, `scripts/`, `openspec/`.
- **Unchanged:** rules nº 1 (task scope), nº 2 (no automatic deploy), nº 3 (instruction priority) and the OpenSpec validation checklist.
- Companion files in the same branch: `openspec/project.md` and `openspec/AGENTS.md` (commit `399d7ee`), so rule nº 3 now points to an existing file.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- None. Documentation-only change (`skip_specs: true`): no application behavior or spec requirement changes.

## Impact

- Files: `AGENTS.md` (root). Related: `openspec/project.md`, `openspec/AGENTS.md`.
- No code, API, database or dependency changes.
- AI assistants (Gemini Code Assist / Antigravity Agent and others) now receive the current stack, the secrets rule and the migration/PR conventions.
