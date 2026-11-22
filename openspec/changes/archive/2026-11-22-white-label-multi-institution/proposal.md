# Proposal

## Why

O EduTrack AI ainda exibe referências fixas à "Faculdade Impacta" no título da aplicação (`index.html` e `main.js`) e em textos padrão visíveis antes ou independentemente da instituição informada pelo usuário. Para suportar uso multi-instituição (white-label), a marca padrão deve ser neutra antes da autenticação e exibir dinamicamente a instituição do usuário após o login/cadastro.

## What Changes

- Substituir o título padrão em `index.html` e `main.js` por `"EduTrack AI | Planner Acadêmico Inteligente"`.
- Garantir que o `Header` exiba a instituição informada pelo usuário apenas quando autenticado, utilizando fallback neutro (`"Planner Acadêmico"`) quando a instituição ainda não tiver sido preenchida no cadastro/perfil.
- Remover ou tornar dinâmicas as referências fixas remanescentes à "Faculdade Impacta" em telas da aplicação (`SubjectsView`, `TasksView`, `TimerView`), preservando sugestões neutras/multi-instituição no cadastro (`RegisterView`).
- Atualizar/adicionar testes unitários cobrindo a exibição neutra antes da autenticação e dinâmica após o login.

## Capabilities

### New Capabilities
- `institution-branding`: Identidade visual neutra (white-label) antes do login/cadastro e exibição dinâmica da instituição do usuário autenticado com fallback neutro.

### Modified Capabilities
<!-- Nenhuma capability existente teve alteração de requisitos -->

## Impact

- `index.html`, `main.js`
- `src/context/AuthContext.tsx`
- `src/components/layout/Header.tsx`
- `src/views/SubjectsView.tsx`, `src/views/TasksView.tsx`, `src/views/TimerView.tsx`, `src/views/RegisterView.tsx`
- Testes em `src/__tests__/` (ou `src/**/*.test.*`)
