-- Definição de Endpoints REST e Politicas CRUD para 'subjects' (EduTrack AI)
-- 1. READ (GET /rest/v1/subjects)
CREATE POLICY "Users can select their own subjects" ON public.subjects
    FOR SELECT USING (auth.uid() = user_id);

-- 2. CREATE (POST /rest/v1/subjects)
CREATE POLICY "Users can insert their own subjects" ON public.subjects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE (PATCH /rest/v1/subjects?id=eq.{id})
CREATE POLICY "Users can update their own subjects" ON public.subjects
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. DELETE (DELETE /rest/v1/subjects?id=eq.{id})
CREATE POLICY "Users can delete their own subjects" ON public.subjects
    FOR DELETE USING (auth.uid() = user_id);
