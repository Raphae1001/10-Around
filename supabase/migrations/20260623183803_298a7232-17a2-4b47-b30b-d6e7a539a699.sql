
ALTER FUNCTION public.get_my_profile() SECURITY INVOKER;
ALTER FUNCTION public.get_my_stats() SECURITY INVOKER;
ALTER FUNCTION public.get_my_recent_participations(integer) SECURITY INVOKER;
ALTER FUNCTION public.answer_confirmation(uuid, public.confirmation_answer) SECURITY INVOKER;
