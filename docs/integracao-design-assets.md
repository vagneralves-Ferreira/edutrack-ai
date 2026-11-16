# Integração de Design System, Assets e Views – EduTrack AI

**Disciplina:** Innovation Lab: Desenvolvimento Avançado No/Low Code  
**Projeto:** EduTrack AI  

## 🎨 Mapeamento do Design System para React + Tailwind CSS

Em substituição à montagem manual no FlutterFlow, toda a interface e navegação do EduTrack AI foi construída de forma modular em React com Tailwind CSS:

### 1. Estrutura de Páginas e Navegação (`src/views/` & `src/components/layout/`)
- **Autenticação (Telas Empilhadas 3D):**
  - `src/views/LoginView.tsx` — Acesso ao Cockpit, recuperação de senha e alternância de tema responsiva (flutuante no desktop, interna no card no mobile).
  - `src/views/RegisterView.tsx` — Criação de perfil acadêmico (suporte multi-instituição/curso).
  - `src/views/ResetPasswordView.tsx` — Redefinição de senha com validação via Supabase Auth.
- **Área Logada:**
  - `src/views/DashboardView.tsx` — Visão geral de métricas acadêmicas, progresso e próximas entregas.
  - `src/views/SubjectsView.tsx` — Gestão de disciplinas, módulos, materiais clicáveis e carga horária.
  - `src/views/TasksView.tsx` — Gestão de tarefas acadêmicas, filtros e sincronização com Google Classroom.
  - `src/views/TimerView.tsx` — Cronômetro de foco e sessões de estudo.
  - `src/views/AiAssistantView.tsx` — Copiloto de estudos com Gemini AI e exportação de relatório em PDF.
- **Navegação:** `src/components/layout/Sidebar.tsx` e `src/components/layout/Header.tsx`.

### 2. Assets e Ícones (Design System)
- **Ícones SVG Dinâmicos:** Integrados via `lucide-react`.
- **Assets Estáticos:** Organizados em `src/assets/` e `assets/`.
- **Tokens e Temas:** Variáveis CSS e utilitários Bento Grid definidos em `src/index.css` com suporte a `html.dark` e `html.light`.
