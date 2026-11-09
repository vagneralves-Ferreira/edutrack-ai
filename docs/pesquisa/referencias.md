# Análise de Referências e Decisões de Arquitetura – EduTrack AI

**Disciplina:** Innovation Lab: Desenvolvimento Avançado No/Low Code  
**Projeto:** EduTrack AI  

## 🏗️ Benchmarking e Escolhas Tecnológicas

### 1. Interface e Design System (Substituição do Figma por Tailwind CSS)
- **Decisão:** Em vez de prototipar via Figma, optou-se pelo desenvolvimento direto em React com Tailwind CSS e a biblioteca Lucide React.
- **Justificativa:** Maior agilidade na renderização de componentes dinâmicos (Dark Theme nativo, visualização de estatísticas e filtros de tarefas) diretamente em código pronto para produção na Vercel.

### 2. Backend e Banco de Dados (Escolha do Supabase vs. Xano)
- **Decisão:** Opção pelo Supabase (PostgreSQL BaaS) em detrimento do Xano.
- **Justificativa:** O Supabase ofereceu integração nativa com o SDK JS/TS do React (`@supabase/supabase-js`), autenticação integrada e definições de tabelas relacionais em SQL, tornando a arquitetura mais robusta e eficiente para o projeto.

---

## 💡 Principal Sacada
A principal sacada foi priorizar uma pilha de desenvolvimento unificada em TypeScript (React + Supabase), eliminando a necessidade de intermediários como Figma ou Xano e permitindo a criação de um MVP funcional, responsivo e já implantado em produção.
