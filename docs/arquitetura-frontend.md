# Configuração e Arquitetura do Frontend – EduTrack AI

**Disciplina:** Innovation Lab: Desenvolvimento Avançado No/Low Code  
**Projeto:** EduTrack AI  

## 📱 Decisão de Arquitetura Frontend: React vs. FlutterFlow

Em substituição à ferramenta visual FlutterFlow, o frontend do EduTrack AI foi desenvolvido utilizando **React (TypeScript)** e **Tailwind CSS**, por ter sido implantado diretamente em produção via Vercel.

### 1. Design System e Estilização
- **Implementação:** Definido via Tailwind CSS no ficheiro `src/index.css` com variáveis de temas (Dark Mode nativo, paleta de cores sky/amber/indigo) e ícones da biblioteca Lucide React.
- **Componentes:** Estrutura modular em `src/components/` e `src/views/`.

### 2. Integração com Backend e APIs
- **Implementação:** Em vez de API Groups manuais do Xano, a integração é realizada via SDK nativo do Supabase (`@supabase/supabase-js`) centralizado em `src/lib/supabase.ts` e consumido por Contextos React (`src/context/PlannerContext.tsx`).
