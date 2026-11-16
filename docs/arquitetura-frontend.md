# Configuração e Arquitetura do Frontend – EduTrack AI

**Disciplina:** Innovation Lab: Desenvolvimento Avançado No/Low Code  
**Projeto:** EduTrack AI  

## 📱 Decisão de Arquitetura Frontend: React + TypeScript + Vite

Em substituição ao FlutterFlow, o frontend do EduTrack AI foi desenvolvido com **React**, **TypeScript**, **Vite** e **Tailwind CSS**, implantado em produção na **Vercel**.

### 1. Design System e Estilização
- **Implementação:** Definido em `src/index.css` com suporte completo a **Dark Mode** e **Light Mode** (`ThemeContext.tsx` + `color-scheme`), cards em estilo **Bento Grid** com glassmorphism e efeito 3D de telas empilhadas (`screen-stack-stage`) na autenticação.
- **Ícones:** Biblioteca `lucide-react`.
- **Responsividade:** Layout adaptável para desktop e mobile (incluindo alternância de tema integrada ao card de login em telas pequenas).

### 2. Gerenciamento de Estado e Contextos (`src/context/`)
- `AuthContext.tsx`: Autenticação JWT via Supabase Auth, cadastro, login e fluxo de recuperação/redefinição de senha.
- `PlannerContext.tsx`: Estado central de disciplinas, tarefas acadêmicas, perfil multi-instituição e sincronização em nuvem.
- `ThemeContext.tsx`: Alternância entre tema escuro e claro com persistência em `localStorage` e controle de `color-scheme`.
- `TimerContext.tsx`: Controle do cronômetro de foco e sessões de estudo.

### 3. Integração com Backend, IA e Serviços (`src/lib/`, `src/services/`, `src/utils/`)
- **Supabase (`src/lib/supabase.ts`):** Substitui API Groups do Xano, consumindo PostgreSQL com Row Level Security (RLS) diretamente via `@supabase/supabase-js`.
- **Gemini AI Copilot (`supabase/functions/ai-dicas`):** Edge Function no Supabase que gera recomendações de estudo em tempo real com base nas disciplinas e tarefas do usuário.
- **Google Classroom (`src/services/classroomSync.ts`):** Central de sincronização de turmas, atividades, datas e anexos de estudo.
- **Exportação de PDF (`src/utils/reportGenerator.ts`):** Geração de relatório acadêmico em PDF diretamente pela interface web.
