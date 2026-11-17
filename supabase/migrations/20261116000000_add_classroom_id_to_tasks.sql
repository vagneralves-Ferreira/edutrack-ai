-- Stable Google Classroom key for imported tasks, so a re-sync updates the existing card
-- instead of creating a duplicate.
--
-- Non-destructive: adds one nullable column and one unique index.
-- No existing row is updated or deleted (every current task simply gets classroom_id = NULL).
-- Multiple NULLs are allowed by the unique index, so manual tasks are unaffected.
--
-- Key format written by the app:
--   gc:<courseId>:<courseWorkId>   Apps Script / Google API (official Classroom ids)
--   json:<courseId>:<id>           JSON export with ids
--   paste:<hash>                   pasted text (hash of title + class + due date)

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS classroom_id TEXT;

COMMENT ON COLUMN public.tasks.classroom_id IS
  'Stable Google Classroom key (gc:<courseId>:<courseWorkId>, json:..., paste:<hash>). NULL for manual tasks.';

CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_id_classroom_id_key
  ON public.tasks (user_id, classroom_id);
