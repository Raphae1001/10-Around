
-- Lock down SECURITY DEFINER functions: revoke broad EXECUTE and grant narrowly.

-- Internal/trigger-only or admin-only functions: no client execution.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_confirmations(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_due_confirmations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_minyan_constraints() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_minyan_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_minyan_location() FROM PUBLIC, anon, authenticated;

-- User-facing SECURITY DEFINER helpers: restrict EXECUTE to signed-in users only.
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_recent_participations(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_recent_participations(integer) TO authenticated;

REVOKE ALL ON FUNCTION public.answer_confirmation(uuid, public.confirmation_answer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_confirmation(uuid, public.confirmation_answer) TO authenticated;
