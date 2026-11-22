# subjects Specification

## Purpose
Permitir que cada aluno mantenha a grade de disciplinas do semestre (código, nome, professores, carga horária, horário, descrição e tópicos) em `public.subjects`, base do Cockpit, do Kanban e do relatório de progresso.

## Requirements

### Requirement: Adicionar Nova Disciplina
O sistema SHALL permitir cadastrar uma nova disciplina pelo botão "Nova Disciplina" e SHALL gravá-la em `public.subjects` com o `user_id` do aluno autenticado.

#### Scenario: Clicar no botao
- **WHEN** o usuário clica em "Nova Disciplina"
- **THEN** o sistema abre o formulário de cadastro da disciplina

#### Scenario: Salvar disciplina
- **WHEN** o usuário preenche código e nome e confirma o cadastro
- **THEN** a disciplina aparece na grade e é salva em `public.subjects` com o seu `user_id`

### Requirement: Extração e Consolidação de Anexos do Google Classroom
O sistema SHALL extrair os anexos (`driveFile`, `youtubeVideo`, `link`, `form`) tanto de `courseWork` quanto de `courseWorkMaterials` e `announcements` durante a sincronização do Google Classroom, preservando `title`, `url`, `alternateLink`, `driveFileId` (quando aplicável) e `type`, e SHALL consolidar atividades com anexos na seção "Materiais de Aula & Mural Classroom" da disciplina.

#### Scenario: Atividade do Classroom com anexo de arquivo no Google Drive
- **WHEN** o aluno sincroniza uma turma que possui uma atividade (`courseWork`) com `materials` contendo um `driveFile`
- **THEN** o sistema extrai o anexo com título, tipo `drive`, `driveFileId` e URL válida (`alternateLink` ou `https://drive.google.com/file/d/{id}/view`), vincula o anexo à tarefa e à avaliação correspondente, e inclui o item com seus anexos em "Materiais de Aula & Mural Classroom"

#### Scenario: Exibição de anexos nos cards de Atividades e Avaliações
- **WHEN** o aluno visualiza uma disciplina em `SubjectsView` cujas atividades ou avaliações do Google Classroom possuem anexos
- **THEN** os cards em "Atividades do Google Classroom" e "Avaliações & Entregas Registradas" exibem os anexos clicáveis com nome, tipo e abertura direta em nova aba (`target="_blank" rel="noopener noreferrer"`)

### Requirement: Modal de Detalhes de Materiais sem Tela Preta e Abertura Direta
O sistema MUST renderizar o modal de detalhes de materiais/anexos em `SubjectsView` fora do container animado da página (via `createPortal` em `document.body`) e MUST abrir todos os anexos em nova aba (`target="_blank" rel="noopener noreferrer"`) sem usar `<iframe>` incorporado para links do Google Drive ou Google Classroom.

#### Scenario: Abrir modal de material com anexo na seção Materiais de Aula & Mural Classroom
- **WHEN** o aluno clica em um card de "Materiais de Aula & Mural Classroom" (como um item com indicador "1 anexo")
- **THEN** o modal de detalhes abre centralizado e visível sobre a viewport (sem tela preta), listando todos os anexos individualmente com título, tipo e botão para abrir diretamente no Google Drive ou Google Classroom em nova aba
