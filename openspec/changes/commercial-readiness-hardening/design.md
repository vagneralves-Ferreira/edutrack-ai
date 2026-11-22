## Context
- A auditoria em `src/views/` e `src/components/` identificou 4 modais `fixed inset-0` sem `createPortal`: `TasksView.tsx`, `UpcomingTasksSection.tsx`, `NewTaskModal.tsx` e `ClassroomSyncModal.tsx`.
- `package.json` não possui `vitest` nem script `test`.
- `src/services/classroomSync.ts` possui `extractAttachments` como função interna não exportada.

## Decisions
1. **Portais (`createPortal`)**: Adicionar `createPortal(..., document.body)` nos 4 componentes auditados, mantendo paridade com `SubjectsView.tsx` e `Header.tsx`.
2. **Sanitização e Testes (`Vitest`)**:
   - Exportar `sanitizeExternalUrl` (aceita apenas `http:` / `https:`) e `extractAttachments` em `src/services/classroomSync.ts`.
   - Garantir deduplicação por URL normalizada em `extractAttachments`.
   - Instalar `vitest` como `devDependency` e adicionar `"test": "vitest run"` ao `package.json`.
   - Criar `src/services/__tests__/classroomSync.test.ts` testando: `driveFile` com `alternateLink`, `driveFile` apenas com `id` (fallback), `youtubeVideo`, `link`, `form`, URLs vazias/inválidas (`javascript:`, espaços, `null`), deduplicação com `postUrl`, e consolidação de `courseWork`, `courseWorkMaterials` e `announcements` em `buildSyncResultFromCourseBundles`.
3. **Preservação em falhas parciais (`src/context/PlannerContext.tsx`)**:
   - Em `syncClassroomData`, ler `prevStored = loadClassroomSubjectData(userId)` antes de salvar; se `result.warnings?.length`, mesclar `mergeClassroomSubjectData(incoming, prevStored[id])` (e sempre preservar `taskAttachments` existentes caso a resposta parcial venha vazia).
