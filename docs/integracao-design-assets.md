# Integração de Design System, Assets e Views – EduTrack AI

**Disciplina:** Innovation Lab: Desenvolvimento Avançado No/Low Code  
**Projeto:** EduTrack AI  

## 🎨 Mapeamento do Figma/FlutterFlow para React + Tailwind CSS

Em substituição à montagem manual no FlutterFlow, a estrutura de design e navegação do EduTrack AI foi construída de forma modular em React com Tailwind CSS:

### 1. Estrutura de Páginas e Navegação (Views & Layout)
- **Dashboard (HomePage):** `src/views/DashboardView.tsx` - Visão geral de métricas acadêmicas e progresso.
- **Disciplinas (SubjectsPage):** `src/views/SubjectsView.tsx` - Gestão de disciplinas ativas e carga horária.
- **Tarefas (TasksPage):** `src/views/TasksView.tsx` - Lista e status de tarefas acadêmicas.
- **Navegação (NavBar/Sidebar):** `src/components/layout/Sidebar.tsx` e `Header.tsx` para alternância de telas.

### 2. Assets e Ícones (Design System)
- **Ícones SVG Dinâmicos:** Integrados via `lucide-react` para máxima fidelidade e performance escalar.
- **Assets Estáticos:** Gerenciados na pasta `src/assets/` e no diretório `assets/`.
- **Design System:** Cores e variáveis customizadas nativamente via Tailwind CSS no `src/index.css`.
