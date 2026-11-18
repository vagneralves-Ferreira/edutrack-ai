-- =============================================================================
-- CRUD de disciplinas (public.subjects) — Tarefa 13
-- A API REST é gerada pelo Supabase (PostgREST) em /rest/v1/subjects; o filtro por usuário
-- é feito pelas policies RLS abaixo, idênticas às de schema.sql (seção 4) e às do banco.
-- =============================================================================

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- 1. READ   — GET /rest/v1/subjects
CREATE POLICY "subjects_select_own"
  ON public.subjects
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. CREATE — POST /rest/v1/subjects
CREATE POLICY "subjects_insert_own"
  ON public.subjects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE — PATCH /rest/v1/subjects?id=eq.{id}
CREATE POLICY "subjects_update_own"
  ON public.subjects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. DELETE — DELETE /rest/v1/subjects?id=eq.{id}
CREATE POLICY "subjects_delete_own"
  ON public.subjects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
