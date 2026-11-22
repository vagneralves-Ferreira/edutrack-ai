## Context
- `SubjectsView` é renderizada dentro de `.bento-card` (`backdrop-filter: blur(20px)`, `overflow: hidden`) e `.screen-slide-in-right` (`will-change: transform, opacity`) em `src/App.tsx`.
- Qualquer modal com `position: fixed; inset: 0` renderizado sem `createPortal(..., document.body)` fica preso ao containing block do ancestral transformado/filtrado, causando o bug da tela preta ao clicar em cards no final da página.
- `classroomSync.ts` atualmente chama `extractAttachments` apenas para `bundle.materials` (`courseWorkMaterials`) e `bundle.announcements`, ignorando `work.materials` em `bundle.courseWork`.

## Decisions
1. **Tipos (`src/types/index.ts`)**:
   - Estender `MaterialAttachment` com `driveFileId?: string` e `alternateLink?: string`.
   - Adicionar `attachments?: MaterialAttachment[]` em `Task` e `Evaluation`, e `classroomId?: string` opcional em `StudyMaterial`.
2. **Sincronização (`src/services/classroomSync.ts`)**:
   - Mover `extractAttachments` para antes do loop de `courseWorkList`.
   - Em `extractAttachments`, resolver a URL do `driveFile` usando `df.alternateLink || (df.id ? 'https://drive.google.com/file/d/' + df.id + '/view' : undefined)` e salvar `driveFileId`.
   - Separar `fileAttachments` (anexos reais: `drive`, `youtube`, `link`, `form`) do link de fallback `classroom`.
   - Anexar `attachments` às `Task`s e `Evaluation`s geradas a partir de `courseWork`, e adicionar um `StudyMaterial` consolidado em `materials` sempre que `fileAttachments.length > 0`.
3. **Persistência e Hidratação (`src/context/PlannerContext.tsx`)**:
   - Armazenar `taskAttachments?: Record<string, MaterialAttachment[]>` dentro de `ClassroomSubjectData` (`edutrack_classroom_subject_data_v1` no `localStorage`), mantendo `schema.sql` e `public.tasks` inalterados.
   - Hidratar `task.attachments` em `applyDbSnapshot` pelo `task.classroomId`.
4. **Interface (`src/views/SubjectsView.tsx`)**:
   - Envolver o modal `selectedMaterial` e o modal `isModalOpen` com `createPortal(..., document.body)`.
   - Exibir links diretos clicáveis (`target="_blank" rel="noopener noreferrer"`) nos cards de `Atividades do Google Classroom` e `Avaliações & Entregas Registradas`.
   - No modal `selectedMaterial`, listar cada anexo com badge de tipo, título e botão claro ("Abrir no Drive", "Abrir no Classroom", etc.).
