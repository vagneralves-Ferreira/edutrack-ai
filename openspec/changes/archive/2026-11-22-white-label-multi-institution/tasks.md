# Tasks

## 1. Identidade Neutra nos Pontos de Entrada

- [x] 1.1 Atualizar `<title>` em `index.html` para `"EduTrack AI | Planner Acadêmico Inteligente"` e verificar que não há menção a `"Faculdade Impacta"`.
- [x] 1.2 Atualizar `title` da janela Electron em `main.js` para `"EduTrack AI | Planner Acadêmico Inteligente"` e verificar que não há menção a `"Faculdade Impacta"`.

## 2. Instituição Dinâmica e Fallback Neutro

- [x] 2.1 Remover a inferência fixa por domínio `@impacta.edu` em `src/context/AuthContext.tsx`, mantendo `institution` vinda de `user_metadata.institution` (trimada) ou `undefined` quando não preenchida.
- [x] 2.2 Atualizar `src/components/layout/Header.tsx` para exibir `currentUser?.institution` somente quando autenticado e preenchido, usando fallback neutro `"Planner Acadêmico"` caso contrário.
- [x] 2.3 Atualizar referências fixas à "Impacta" em `src/views/SubjectsView.tsx`, `src/views/TasksView.tsx`, `src/views/TimerView.tsx` e `src/views/RegisterView.tsx` (mantendo sugestões multi-instituição neutras no cadastro) para textos neutros ou dinâmicos com `currentUser?.institution`.

## 3. Testes, Build, Empacotamento e Git

- [x] 3.1 Adicionar/atualizar testes automatizados verificando o comportamento white-label (título neutro, fallback sem instituição, instituição dinâmica após login) e rodar `npm test` sem falhas.
- [x] 3.2 Rodar `npm run build` e `npm run dist` (`electron-builder`) e gerar `release/edutrack-ai-win-x64.zip` sem `node_modules` nem `.env`.
- [x] 3.3 Validar e arquivar a change no OpenSpec, e realizar commit e push das alterações no Git.
