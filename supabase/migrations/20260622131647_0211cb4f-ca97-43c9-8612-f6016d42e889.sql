REVOKE ALL ON FUNCTION public.request_confirmations(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_due_confirmations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.answer_confirmation(uuid, public.confirmation_answer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_confirmation(uuid, public.confirmation_answer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_confirmations(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_due_confirmations() TO service_role;