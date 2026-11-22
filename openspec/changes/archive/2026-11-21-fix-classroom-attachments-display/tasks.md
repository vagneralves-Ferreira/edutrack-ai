## 1. Tipos e Sincronização do Google Classroom
- [x] 1.1 Atualizar `MaterialAttachment`, `StudyMaterial`, `Evaluation` e `Task` em `src/types/index.ts` para incluir `driveFileId`, `alternateLink` e `attachments`.
- [x] 1.2 Atualizar `extractAttachments` e o loop de `courseWork` em `src/services/classroomSync.ts` para extrair `work.materials` (`driveFile`, `youtubeVideo`, `link`, `form`) com URL válida, vincular às tarefas e avaliações e consolidar atividades com anexos em `subject.materials`.
- [x] 1.3 Atualizar `src/context/PlannerContext.tsx` para persistir e hidratar `taskAttachments` por `classroomId` em `ClassroomSubjectData`.

## 2. Interface em SubjectsView e Validação
- [x] 2.1 Exibir anexos clicáveis (`target="_blank" rel="noopener noreferrer"`) nos cards de "Atividades do Google Classroom" e "Avaliações & Entregas Registradas" em `src/views/SubjectsView.tsx`.
- [x] 2.2 Corrigir a renderização do modal `selectedMaterial` (e `isModalOpen`) usando `createPortal(..., document.body)` em `src/views/SubjectsView.tsx` e garantir botões diretos ("Abrir no Drive" / "Abrir no Classroom") sem `<iframe>`.
- [x] 2.3 Validar `openspec validate fix-classroom-attachments-display --strict` e executar `npm run build` sem erros de TypeScript.
