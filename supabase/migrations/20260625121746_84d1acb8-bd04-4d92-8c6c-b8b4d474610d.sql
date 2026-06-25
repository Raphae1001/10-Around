DROP POLICY IF EXISTS "Users can only add themselves to threads" ON public.chat_thread_members;
CREATE POLICY "Users can only add themselves to threads"
ON public.chat_thread_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());