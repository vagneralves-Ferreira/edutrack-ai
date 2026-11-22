## Why
Para preparar o EduTrack AI para uso comercial em produção, é necessário eliminar riscos de regressão visual e perda silenciosa de dados já observados em integrações externas e overlays:
1. Modais e overlays renderizados sem `createPortal(..., document.body)` dentro de containers com `backdrop-filter`, `transform` ou `overflow: hidden` (como `.bento-card` e `.screen-slide-in-right`) podem gerar tela preta ou recortes em diferentes resoluções (`TasksView`, `UpcomingTasksSection`, `NewTaskModal`, `ClassroomSyncModal`).
2. A lógica crítica de extração e consolidação de anexos do Google Classroom (`extractAttachments` e `buildSyncResultFromCourseBundles` em `src/services/classroomSync.ts`) não possui cobertura de testes unitários automatizados (`npm test` / Vitest).
3. Falhas parciais na API do Google Classroom (`result.warnings`) podem sobrescrever com listas vazias os anexos e materiais já sincronizados no cache local (`CLASSROOM_DATA_KEY`).

## What Changes
- **Auditoria e blindagem de Modais/Drawers (`src/views/TasksView.tsx`, `src/components/dashboard/UpcomingTasksSection.tsx`, `src/components/tasks/NewTaskModal.tsx`, `src/components/classroom/ClassroomSyncModal.tsx`)**:
  - Envolver todos os modais e overlays `fixed inset-0` com `createPortal(..., document.body)` para isolá-los de containers pai com `backdrop-filter`, `transform` ou `overflow: hidden`.
- **Suíte de testes unitários com Vitest (`package.json`, `src/services/__tests__/classroomSync.test.ts`)**:
  - Instalar/configurar `vitest` e script `"test": "vitest run"` no `package.json`.
  - Exportar `extractAttachments` e `sanitizeExternalUrl` em `src/services/classroomSync.ts` com sanitização de URLs inválidas/inseguras e deduplicação de anexos.
  - Criar testes unitários cobrindo `extractAttachments` e `buildSyncResultFromCourseBundles` para `courseWork`, `courseWorkMaterials` e `announcements` (fallback de URL do Google Drive, links vazios/inválidos e prevenção de duplicidade).
- **Tratamento defensivo de sincronização parcial (`src/context/PlannerContext.tsx`)**:
  - Quando a sincronização retornar `warnings` (falha parcial na API do Google Classroom), preservar os anexos, materiais e avaliações já existentes no cache local (`CLASSROOM_DATA_KEY`) via `mergeClassroomSubjectData` em vez de sobrescrevê-los com arrays vazios.

## Impact
- `package.json`
- `src/services/classroomSync.ts`
- `src/services/__tests__/classroomSync.test.ts` (novo)
- `src/context/PlannerContext.tsx`
- `src/views/TasksView.tsx`
- `src/components/dashboard/UpcomingTasksSection.tsx`
- `src/components/tasks/NewTaskModal.tsx`
- `src/components/classroom/ClassroomSyncModal.tsx`
