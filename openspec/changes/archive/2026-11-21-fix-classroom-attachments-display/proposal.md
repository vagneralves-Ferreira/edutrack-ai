## Why
Na tela de Disciplinas (`SubjectsView`), dois problemas impedem o acesso aos materiais e anexos sincronizados do Google Classroom:
1. Atividades do Google Classroom (`courseWork`) que possuem arquivos/links anexados (`work.materials`) não têm seus anexos extraídos durante a sincronização (`classroomSync.ts`), fazendo com que não apareçam nos cards de "Atividades do Google Classroom", nem em "Avaliações & Entregas Registradas", nem consolidados em "Materiais de Aula & Mural Classroom".
2. Ao clicar em um card de "Materiais de Aula & Mural Classroom" (ex.: indicador "1 anexo" / ícone externo), o modal de detalhes (`selectedMaterial`) é renderizado sem `createPortal(..., document.body)` dentro de ancestrais com `backdrop-filter` (`.bento-card`) e `will-change: transform` (`.screen-slide-in-right`), prendendo o `position: fixed` no container da página e exibindo apenas o overlay escuro ("tela preta") em vez do modal com os links diretos para o Google Drive/Classroom.

## What Changes
- **Extração e consolidação de anexos (`src/services/classroomSync.ts`, `src/types/index.ts`, `src/context/PlannerContext.tsx`)**:
  - Atualizar `MaterialAttachment` para suportar `driveFileId` e `alternateLink`, garantindo URLs válidas para `driveFile` (`alternateLink` ou `https://drive.google.com/file/d/{id}/view`), `youtubeVideo`, `link` e `form`.
  - Extrair `work.materials` de `courseWork` em `buildSyncResultFromCourseBundles`, anexando os arquivos às `Task`s, às `Evaluation`s correspondentes e consolidando atividades com anexos em `subject.materials` ("Materiais de Aula & Mural Classroom").
  - Persistir e hidratar os anexos das tarefas sincronizadas em `PlannerContext` (`CLASSROOM_DATA_KEY`) sem alterar o schema do Supabase.
- **Exibição de anexos e correção do modal em `SubjectsView` (`src/views/SubjectsView.tsx`)**:
  - Exibir os anexos clicáveis (nome do arquivo, tipo e link direto em nova aba com `target="_blank" rel="noopener noreferrer"`) nos cards de "Atividades do Google Classroom" e "Avaliações & Entregas Registradas".
  - Renderizar o modal de detalhes do material (`selectedMaterial`) e o modal de nova disciplina (`isModalOpen`) via `createPortal(..., document.body)` para eliminar a tela preta causada pelo stacking context/containing block, listando todos os anexos individualmente com título, tipo e botão de abertura direta no Google Drive / Classroom.

## Impact
- `src/types/index.ts`
- `src/services/classroomSync.ts`
- `src/context/PlannerContext.tsx`
- `src/views/SubjectsView.tsx`
