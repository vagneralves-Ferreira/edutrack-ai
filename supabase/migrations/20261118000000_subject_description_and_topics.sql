-- Description and syllabus topics typed by the student in "Editar disciplina".
--
-- Non-destructive: adds two nullable columns. No existing row is updated or deleted
-- (every current subject simply gets descricao = NULL and topicos = NULL).

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS descricao TEXT;

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS topicos TEXT[];

COMMENT ON COLUMN public.subjects.descricao IS
  'Subject description typed by the student. NULL = not set.';

COMMENT ON COLUMN public.subjects.topicos IS
  'Syllabus topics typed by the student (one per item). NULL = not set; Classroom topics are shown instead.';
