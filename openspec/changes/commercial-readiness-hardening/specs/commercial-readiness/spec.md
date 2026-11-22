# commercial-readiness Specification

## Purpose
Estabelecer garantias de qualidade, blindagem de interface para modais/drawers, cobertura de testes unitários e resiliência na sincronização com o Google Classroom para uso comercial do EduTrack AI.

## ADDED Requirements

### Requirement: Isolamento de Modais e Drawers via Portal
Todos os modais e drawers de tela cheia (`fixed inset-0`) em `src/views/` e `src/components/` MUST ser renderizados via `createPortal(..., document.body)` sempre que possam estar sob containers com `backdrop-filter`, `transform` ou `overflow: hidden`, prevenindo telas pretas ou recortes em qualquer resolução.

#### Scenario: Abertura de modais fora de stacking contexts locais
- **WHEN** o usuário abre o modal de sincronização, criação de tarefa ou detalhes em `TasksView`, `UpcomingTasksSection`, `NewTaskModal` ou `ClassroomSyncModal`
- **THEN** o overlay e o conteúdo do modal são montados diretamente em `document.body` e exibidos centralizados sobre a viewport sem recorte ou tela preta

### Requirement: Cobertura de Testes Unitários para Extração e Consolidação de Anexos
O projeto SHALL manter testes automatizados unitários executáveis via `npm test` (Vitest) cobrindo `extractAttachments` e a consolidação de `courseWork`, `courseWorkMaterials` e `announcements` em `src/services/classroomSync.ts`, incluindo fallback de URL do Google Drive, descarte de links vazios ou inválidos e prevenção de duplicidade.

#### Scenario: Execução da suíte de testes unitários
- **WHEN** o desenvolvedor ou pipeline executa `npm test`
- **THEN** todos os testes de extração de anexos, fallback do Google Drive, sanitização de URLs inválidas/vazias e deduplicação passam sem erros

### Requirement: Resiliência a Falhas Parciais de Sincronização e Links Ausentes
O sistema MUST tratar de forma defensiva falhas parciais na API do Google Classroom e links ausentes ou inválidos, garantindo que a renderização não quebre, que anexos e materiais já sincronizados não sejam apagados do cache local em falhas parciais e que o usuário receba feedback claro sobre avisos.

#### Scenario: Falha parcial ao buscar materiais na API do Google Classroom
- **WHEN** a sincronização retorna `warnings` por falha parcial em `courseWorkMaterials` ou `announcements`
- **THEN** o sistema preserva os materiais e anexos previamente sincronizados no cache local da disciplina e exibe o aviso correspondente ao usuário
