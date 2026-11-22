## 1. Blindagem de Modais e Drawers
- [x] 1.1 Atualizar `src/views/TasksView.tsx`, `src/components/dashboard/UpcomingTasksSection.tsx`, `src/components/tasks/NewTaskModal.tsx` e `src/components/classroom/ClassroomSyncModal.tsx` para renderizar modais `fixed inset-0` via `createPortal(..., document.body)`.

## 2. Testes Automatizados (Vitest) e Sanitização
- [x] 2.1 Instalar `vitest` em `devDependencies` e configurar `"test": "vitest run"` em `package.json`.
- [x] 2.2 Exportar `sanitizeExternalUrl` e `extractAttachments` em `src/services/classroomSync.ts` com validação de URLs (`http:`/`https:`), fallback de `driveFileId` e deduplicação de anexos.
- [x] 2.3 Criar `src/services/__tests__/classroomSync.test.ts` cobrindo `extractAttachments` e a consolidação de `courseWork`, `courseWorkMaterials` e `announcements`.

## 3. Resiliência de Sincronização e Validação Final
- [x] 3.1 Atualizar `syncClassroomData` em `src/context/PlannerContext.tsx` para preservar anexos/materiais já sincronizados quando houver `warnings` (falha parcial da API).
- [x] 3.2 Validar `openspec validate commercial-readiness-hardening --strict`, executar `npm test` e confirmar `npm run build` sem erros.
