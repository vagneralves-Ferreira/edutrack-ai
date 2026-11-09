# EduTrack-AI Postman Collection

Esta pasta contém a collection e o environment do Postman para interagir com a API REST do Supabase do projeto EduTrack-AI.

## Arquivos
- **EduTrack-AI.postman_collection.json**: Contém as rotas de autenticação e CRUD (Create, Read, Update, Delete) de Entidades (Subjects, Tasks, StudySessions) usando a API REST gerada pelo PostgREST do Supabase.
- **EduTrack-AI-Environment.postman_environment.json**: Variáveis de ambiente a serem usadas junto com a collection.

## Como Usar
1. Abra o Postman.
2. Clique em **Import** (canto superior esquerdo) e importe os dois arquivos `.json` presentes nesta pasta.
3. No canto superior direito do Postman, certifique-se de selecionar o Environment `EduTrack-AI Supabase Environment`.
4. Clique no ícone de "olho" (Environment quick look) ou vá em "Environments" e preencha as variáveis com os dados do seu projeto Supabase:
   - `supabase_url`: A URL base do seu projeto Supabase (ex: `https://xyz.supabase.co`)
   - `supabase_key`: A chave `anon` ou `service_role` (Project Settings > API)
5. **Autenticação (Importante):**
   - Se for realizar operações em tabelas com RLS (Row Level Security), você precisará do `access_token`.
   - Utilize a requisição **2. Login (Entrar)** na pasta Auth da Collection.
   - Copie o token (`access_token`) retornado e cole-o na variável `access_token` no seu Environment para que as demais requisições funcionem.
