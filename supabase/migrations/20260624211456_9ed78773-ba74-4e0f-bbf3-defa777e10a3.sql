
-- 1) Pin search_path on the only function missing it
CREATE OR REPLACE FUNCTION public.normalize_city(_addr text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(trim(split_part(COALESCE(_addr,''), ',', 1)));
$$;

-- 2) Revoke EXECUTE from PUBLIC and anon on every public function (defense in depth)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;

-- 3) Re-grant EXECUTE to authenticated only on functions the app actually calls from the client
GRANT EXECUTE ON FUNCTION public.cancel_my_minyan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_recent_participations(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_minyan_chat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_chat_threads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_travel_cities() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_city_peers(text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_travelers_in_city(text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_minyanim_within(double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_minyanim_within(double precision, double precision, integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_minyanim(double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_confirmation(uuid, confirmation_answer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_city(text) TO authenticated;
-- Internal helpers (ensure_minyan_chat, request_confirmations, trigger_due_confirmations,
-- cleanup_expired_minyanim, on_*_chat, handle_new_user, set_minyan_location, sync_minyan_count,
-- validate_travel_dates, touch_updated_at, enforce_minyan_constraints) stay revoked from PUBLIC/anon
-- and are not granted to authenticated — only the table owner/service_role/triggers invoke them.

-- 4) chat_thread_members: explicit DELETE policy for self-removal; INSERT remains
--    controlled (no policy = blocked, managed by SECURITY DEFINER functions only)
DROP POLICY IF EXISTS "Users can leave a thread" ON public.chat_thread_members;
CREATE POLICY "Users can leave a thread"
  ON public.chat_thread_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.chat_thread_members IS
  'Membership is added exclusively via SECURITY DEFINER functions (get_or_create_minyan_chat, on_*_chat triggers). Direct INSERT is intentionally disallowed by RLS.';

-- 5) chat_threads: drop the open travel_city read; members-only read remains via is_chat_member()
DROP POLICY IF EXISTS "Authenticated can read travel_city threads" ON public.chat_threads;
