# Instruções para Agentes de IA - EduTrack AI

## Perfil do Projeto
Este é o projeto **EduTrack AI**, um aplicativo de gestão acadêmica inteligente.
- **Frontend:** React + TypeScript + Vite + Tailwind CSS (substitui o FlutterFlow, conforme autorizado pelo professor)
- **Backend:** Supabase – PostgreSQL, API REST, Auth e RLS (substitui o Xano, conforme autorizado pelo professor)
- **Integrações:** Google Classroom API (OAuth 2.0, escopos somente leitura) e Gemini (Edge Function `ai-dicas`)
- **Scripts:** Python 3 em `scripts/`
- **Deploy:** Vercel (preview por branch, produção a partir da `main`)
- **Metodologia:** Spec-Driven Development (OpenSpec) – contexto em `openspec/project.md`
- **IA Assistente:** Gemini / Antigravity Agent

## ⛔ REGRA Nº 1 - ESCOPO DE TAREFAS (OBRIGATÓRIO)
O arquivo `tasks.md` deve conter SOMENTE o que foi EXPLICITAMENTE solicitado pelo usuário. Não crie rotas, componentes ou APIs adicionais não pedidas.

## ⛔ REGRA Nº 2 - NÃO FAÇA DEPLOY AUTOMÁTICO
Sua responsabilidade termina na geração dos arquivos de especificação e documentação. Não tente executar scripts de deploy sem solicitação explícita.

## ⛔ REGRA Nº 3 - PRIORIDADE DE INSTRUÇÕES
1. Estas instruções (`AGENTS.md` da raiz)
2. Pedido explícito do usuário
3. Especificações em `openspec/AGENTS.md`

## ⛔ REGRA Nº 4 - SEGREDOS
Nunca grave nem exiba em código, commits, specs ou prints: arquivos `.env*`, chave `service_role` do Supabase, Client Secret do Google, tokens de acesso ou valores de variáveis da Vercel. No navegador use somente a chave pública (anon) via `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## ⛔ REGRA Nº 5 - SEMPRE CONSULTE O SCHEMA ANTES DE MEXER NO BANCO (OBRIGATÓRIO)
Antes de propor ou alterar tabelas, colunas, policies ou consultas, leia `schema.sql` e `supabase/migrations/`. Não invente tabelas ou colunas: use apenas as que existem (ver "Conhecimento do Schema").

## Customizações e Padrões do EduTrack AI

### Nomenclatura e Padrões
1. **Língua:** Código e variáveis sempre em INGLÊS; textos da interface em português (pt-BR).
2. **Banco de Dados:** Use `snake_case` (ex: `academic_tasks`, `user_id`). Colunas já existentes em português (`nome`, `codigo`, `titulo`) são mantidas.
3. **Migrations:** Toda mudança de schema vira um arquivo em `supabase/migrations/` e é refletida em `schema.sql`.
4. **Branches Git:** Use `feat/`, `fix/`, `docs/`. Mudanças chegam à `main` por Pull Request.
5. **Commits:** Siga Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
6. **Segurança (RLS):** Toda query ou política de acesso DEVE filtrar por `user_id` do usuário autenticado.

### CHECKLIST de Validação OpenSpec (CRÍTICO)
> ⚠ **OBRIGATÓRIO: ANTES de criar qualquer proposal ou spec.md, leia `openspec/AGENTS.md` COMPLETO.**
> Ele contém a estrutura do `proposal.md` (`## Why`, `## What Changes`, `## Impact`), os formatos de delta e os comandos de validação.

**Erros mais comuns que causam falha na validação:**
1. **Localização do arquivo determina o formato**
   - ❌ Usar `## Requirements` em `openspec/changes/<id>/specs/<capability>/spec.md`
   - ✅ Usar `## ADDED Requirements` (ou `## MODIFIED` / `## REMOVED`) em `changes/` – são DELTAS
   - ✅ Usar `## Requirements` apenas em `openspec/specs/<capability>/spec.md` (specs permanentes)
2. **Hierarquia markdown incompleta**
   - ❌ Começar direto com `### Requirement:`
   - ✅ Sempre `# <capability> Specification` → `## Purpose` → `## Requirements` (ou `## ADDED Requirements` em `changes/`)
3. **Palavras-chave:** ❌ "must", "should", "may" em minúsculas · ✅ **SHALL** ou **MUST**
4. **Scenarios:** todo requirement tem ≥ 1 `#### Scenario:` com bullets `- **WHEN**` / `- **THEN**` (nunca texto corrido)
5. **Purpose:** nunca deixe o texto provisório `TBD`; descreva para que serve a capability.
6. **Validação:** `openspec validate <change-id> --strict` antes de implementar e `openspec validate --all` antes de abrir PR (sem erros nem avisos).
7. **Arquivamento:** propostas concluídas vão para `openspec/changes/archive/<id>/` com `openspec archive <id>`.

### Conhecimento do Schema
Tabelas reais em `public` (fonte: `schema.sql`):
1. **`profiles`** – `id` (= `auth.users.id`), `nome`, `curso`, `semestre_atual`, `created_at`.
2. **`subjects`** – `id`, `user_id` → `profiles.id`, `codigo`, `nome`, `professor`, `carga_horaria_total`, `horario`, `descricao`, `topicos`, `created_at`.
3. **`tasks`** – `id`, `subject_id` → `subjects.id`, `user_id` → `profiles.id`, `titulo`, `descricao`, `data_entrega`, `status` (`todo` | `in_progress` | `completed`), `prioridade`, `importado_classroom`, `classroom_id`, `created_at`. (Especificada como `academic_tasks`; o nome real é `tasks`.)
4. **`classroom_ignored_courses`** – `id`, `user_id`, `course_key`, `course_name`, `created_at`.
5. **Relacionamentos:** sempre use `user_id` para vincular ao usuário logado; tarefas sempre pertencem a uma disciplina (`subject_id`).

### Segurança e Boas Práticas
1. **Filtro obrigatório:** toda query filtra por `user_id` do usuário autenticado, além das policies RLS (`<tabela>_select_own`, `_insert_own`, `_update_own`, `_delete_own`).
2. **APIs REST (Supabase / PostgREST):**
   - GET `/rest/v1/subjects` – listar
   - POST `/rest/v1/subjects` – criar
   - PATCH `/rest/v1/subjects?id=eq.{id}` – atualizar
   - DELETE `/rest/v1/subjects?id=eq.{id}` – apagar
3. **Python:** use tratamento de erros (`try`/`except`) em lógica complexa e trate divisão por zero (ver `scripts/calculate_progress.py`).
4. **Segredos:** siga a Regra nº 4; scripts leem chaves de variáveis de ambiente, nunca do código.

### Comunicação
1. Explique o que vai fazer ANTES de fazer.
2. Indique onde os arquivos serão criados ou modificados.
3. Pergunte se há dúvidas sobre as regras específicas deste projeto antes de agir em caso de ambiguidade.

## Estrutura Principal
- `src/views/` telas · `src/components/` componentes · `src/context/` estado e dados (Supabase) · `src/services/` Google/Classroom · `src/lib/supabase.ts` cliente Supabase
- `schema.sql` e `supabase/migrations/` banco e RLS · `supabase/functions/` Edge Functions · `tables/` definições das tarefas do curso
- `scripts/` Python · `openspec/` specs e propostas

## Exemplo de spec.md Válido
```markdown
# subjects Specification

## Purpose
Permitir que cada aluno mantenha a grade de disciplinas do semestre em `public.subjects`.

## Requirements

### Requirement: Adicionar Nova Disciplina
O sistema SHALL gravar cada nova disciplina em `public.subjects` com o `user_id` do aluno autenticado.

#### Scenario: Salvar disciplina
- **WHEN** o usuário preenche código e nome e confirma o cadastro
- **THEN** a disciplina é salva com o seu `user_id`
```

## ⚠ Estrutura INCORRETA (Falha na Validação)
```markdown
### Requirement: Adicionar Nova Disciplina
[conteúdo...]
```
**Por que falha:** começa no nível 3 (`###`) sem o título principal (`#`), sem `## Purpose` e sem `## Requirements`.
