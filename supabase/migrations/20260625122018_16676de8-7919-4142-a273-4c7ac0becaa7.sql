
-- 1) Lock down chat_thread_members INSERT and dedupe SELECT policies
DROP POLICY IF EXISTS "Users can insert themselves" ON public.chat_thread_members;
DROP POLICY IF EXISTS "Users can add themselves to threads" ON public.chat_thread_members;
DROP POLICY IF EXISTS "Members can insert themselves" ON public.chat_thread_members;
DROP POLICY IF EXISTS "insert_self" ON public.chat_thread_members;
DROP POLICY IF EXISTS "chat_thread_members_insert_self" ON public.chat_thread_members;

-- Drop the broad "see own row" SELECT policy; keep the is_chat_member one only
DROP POLICY IF EXISTS "Users can read own membership" ON public.chat_thread_members;
DROP POLICY IF EXISTS "select_self" ON public.chat_thread_members;
DROP POLICY IF EXISTS "Users see own membership" ON public.chat_thread_members;
DROP POLICY IF EXISTS "chat_thread_members_select_self" ON public.chat_thread_members;

-- Helper: may a user legitimately join a given thread?
CREATE OR REPLACE FUNCTION public.can_join_chat_thread(_thread_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id = _thread_id
      AND (
        -- minyan thread: user must be creator or participant
        (t.kind = 'minyan' AND (
          EXISTS (SELECT 1 FROM public.minyanim m WHERE m.id = t.minyan_id AND m.creator_id = _user_id)
          OR EXISTS (SELECT 1 FROM public.minyan_participants p WHERE p.minyan_id = t.minyan_id AND p.user_id = _user_id)
        ))
        -- travel_city thread: user must have a travel_presence in same city
        OR (t.kind = 'travel_city' AND EXISTS (
          SELECT 1 FROM public.travel_presence tp
          WHERE tp.user_id = _user_id AND tp.city_key = t.city_key
        ))
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_join_chat_thread(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_join_chat_thread(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Members can self-join allowed threads"
ON public.chat_thread_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_join_chat_thread(thread_id, auth.uid()));

-- 2) Restrict EXECUTE on SECURITY DEFINER functions to authenticated/service_role only
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon;', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role;', r.proname, r.args);
  END LOOP;
END $$;
