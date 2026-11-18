-- 1. Editable class schedule for a subject ("Editar disciplina" → Horário).
-- 2. Google Classroom classes the student chose to ignore (e.g. after deleting the subject they created),
--    so the next sync does not create them again.
--
-- Non-destructive: adds one nullable column and one new, empty table.
-- No existing row is updated or deleted.

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS horario TEXT;

COMMENT ON COLUMN public.subjects.horario IS
  'Class schedule shown on the subject (e.g. "Seg e Qua • 19:15 - 22:00"). NULL = not set.';

CREATE TABLE IF NOT EXISTS public.classroom_ignored_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- gc-course:<courseId> (official Classroom id) or name:<normalized class/subject name>
  course_key TEXT NOT NULL,
  course_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT classroom_ignored_courses_user_id_course_key_key UNIQUE (user_id, course_key)
);

CREATE INDEX IF NOT EXISTS idx_classroom_ignored_courses_user_id
  ON public.classroom_ignored_courses (user_id);

ALTER TABLE public.classroom_ignored_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classroom_ignored_courses_select_own" ON public.classroom_ignored_courses;
CREATE POLICY "classroom_ignored_courses_select_own"
  ON public.classroom_ignored_courses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "classroom_ignored_courses_insert_own" ON public.classroom_ignored_courses;
CREATE POLICY "classroom_ignored_courses_insert_own"
  ON public.classroom_ignored_courses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "classroom_ignored_courses_update_own" ON public.classroom_ignored_courses;
CREATE POLICY "classroom_ignored_courses_update_own"
  ON public.classroom_ignored_courses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "classroom_ignored_courses_delete_own" ON public.classroom_ignored_courses;
CREATE POLICY "classroom_ignored_courses_delete_own"
  ON public.classroom_ignored_courses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
