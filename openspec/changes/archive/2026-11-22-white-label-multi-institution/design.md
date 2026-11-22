# Design

## Context

Veja `proposal.md` para a motivação. Atualmente, `index.html` e `main.js` trazem `"Faculdade Impacta"` fixo no título da janela/documento, `AuthContext.tsx` infere `"Faculdade Impacta"` para e-mails `@impacta.edu` e usa `"Minha Faculdade"` como fallback, e views autenticadas (`SubjectsView.tsx`, `TasksView.tsx`, `TimerView.tsx`) ainda possuem textos estáticos mencionando `"Impacta"`.

## Goals / Non-Goals

**Goals:**
- Remover a marca fixa `"Faculdade Impacta"` dos pontos de entrada (`index.html`, `main.js`) e de textos padrão da interface.
- Garantir que `Header` exiba a instituição do usuário autenticado dinamicamente e utilize fallback neutro (`"Planner Acadêmico"`) antes da autenticação ou quando a instituição não estiver preenchida.
- Tornar neutras/dinâmicas as referências visíveis em `SubjectsView`, `TasksView` e `TimerView`.

**Non-Goals:**
- Alterar dados de exemplo internos em `src/data/initialData.ts` ou documentação histórica (`README.md`, `openspec/project.md`, `postman/`).
- Alterar o fluxo de autenticação Supabase ou regras de negócio acadêmicas (notas, tarefas, Pomodoro).

## Decisions

- **Título neutro único:** Padronizar `<title>` em `index.html` e `title` em `main.js` como `"EduTrack AI | Planner Acadêmico Inteligente"`.
- **Resolução de instituição no `AuthContext`:** Remover a inferência automática por domínio (`cleanUserEmail.includes('impacta.edu')`) e manter `institution` proveniente de `user_metadata.institution` (trimado); se ausente, deixar `undefined`/vazio no `AppUser` para que a UI aplique o fallback neutro `"Planner Acadêmico"`.
- **Header e Views:** No `Header.tsx`, exibir `{isAuthenticated && currentUser?.institution ? currentUser.institution : 'Planner Acadêmico'}` seguido do semestre apenas quando autenticado ou com fallback limpo. Em `SubjectsView.tsx`, usar `currentUser?.institution || 'Planner Acadêmico'`. Em `TasksView.tsx` e `TimerView.tsx`, substituir referências fixas à `"Impacta"` por `"Google Workspace"` / `"sua instituição"`.

## Risks / Trade-offs

- [Usuários existentes sem `institution` no `user_metadata`] → Passarão a ver `"Planner Acadêmico"` no lugar de `"Faculdade Impacta"` / `"Minha Faculdade"`, comportamento esperado e alinhado ao white-label.
