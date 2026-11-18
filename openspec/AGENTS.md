# OpenSpec Instructions – EduTrack AI

Instructions for AI assistants working with OpenSpec in this repository. The root `AGENTS.md` has priority over this file; read `openspec/project.md` for project context.

## When to create a change proposal
Create a proposal before implementing new features, schema changes, new API/policies or behavior changes. Skip it for typo fixes, formatting and dependency bumps.

## Layout
```
openspec/
├── project.md              # project context
├── config.yaml             # OpenSpec CLI config (schema: spec-driven)
├── specs/<capability>/spec.md        # current truth (academic-tasks, authentication, subjects)
└── changes/
    ├── <change-id>/                  # active proposal
    │   ├── proposal.md               # Why / What Changes / Impact
    │   ├── tasks.md                  # implementation checklist
    │   └── specs/<capability>/spec.md  # spec deltas
    └── archive/<change-id>/          # finished proposals
```

## Workflow
1. **Propose:** pick a kebab-case, verb-led `change-id` (e.g. `add-subject-feature`). Write `proposal.md`, `tasks.md` and the spec deltas.
2. **Validate:** `openspec validate <change-id> --strict` and fix every issue.
3. **Implement:** follow `tasks.md` in order; tick each item only when done. Implement only what was explicitly requested (root `AGENTS.md`, rule 1).
4. **Archive:** after the change is merged, `openspec archive <change-id>` (moves it to `changes/archive/` and updates `specs/`).

## Spec delta format
- Sections: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`.
- Each requirement: `### Requirement: <name>` with normative text (SHALL/MUST).
- Each requirement has at least one scenario:
  ```
  #### Scenario: <name>
  - **WHEN** <condition>
  - **THEN** <expected result>
  ```
- A MODIFIED requirement repeats the full updated requirement, not only the changed lines.

## Project rules that specs must respect
- Supabase replaces Xano: tables in `snake_case`, RLS by `user_id`, migrations in `supabase/migrations/` mirrored in `schema.sql`.
- React + Vite replaces FlutterFlow: UI changes are specified as React screens/components.
- No secrets in specs, examples or screenshots (`.env`, `service_role`, OAuth client secret, tokens).
