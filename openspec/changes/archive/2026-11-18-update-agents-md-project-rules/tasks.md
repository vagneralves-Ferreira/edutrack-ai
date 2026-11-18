## 1. Agent instructions (AGENTS.md)

- [x] 1.1 Update the project profile with Supabase (replacing Xano), React + Vite (replacing FlutterFlow), Classroom/OAuth, Gemini, Python scripts and Vercel, and verify the profile matches `package.json`, `src/services/googleAuth.ts` and `supabase/functions/ai-dicas`
- [x] 1.2 Add rule nº 4 (secrets) and verify no secret value appears in `AGENTS.md`
- [x] 1.3 Add the migration, Pull Request and UI-language conventions and the main structure section, keeping rules nº 1–3 and the OpenSpec checklist unchanged
- [x] 1.4 Commit the change on branch `feat/delivery-pending-items` (commit `fd6eed0`)

## 2. OpenSpec context files

- [x] 2.1 Create `openspec/project.md` and `openspec/AGENTS.md` so rule nº 3 points to an existing file (commit `399d7ee`)

## 3. Validate and archive

- [x] 3.1 Run `openspec validate update-agents-md-project-rules --strict` and verify it passes
- [x] 3.2 Archive with `openspec archive update-agents-md-project-rules --yes --skip-specs`
