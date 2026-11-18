-- =============================================================================
-- public.tasks — tabela de tarefas acadêmicas do EduTrack AI (Supabase / PostgreSQL)
-- Tarefa 11. Especificada inicialmente como `academic_tasks` (change create-academic-tasks-table);
-- a tabela real em produção é `public.tasks`. Este arquivo espelha schema.sql (seções 3 e 4)
-- e a migration supabase/migrations/20261116000000_add_classroom_id_to_tasks.sql.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_entrega TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'todo',
  prioridade TEXT NOT NULL DEFAULT 'media',
  importado_classroom BOOLEAN NOT NULL DEFAULT FALSE,
  -- Stable Google Classroom key (gc:<courseId>:<courseWorkId>, json:..., paste:<hash>); NULL for manual tasks.
  classroom_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON public.tasks(subject_id);
CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_id_classroom_id_key ON public.tasks (user_id, classroom_id);

-- Row Level Security: cada usuário só acessa as próprias tarefas
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_own"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
