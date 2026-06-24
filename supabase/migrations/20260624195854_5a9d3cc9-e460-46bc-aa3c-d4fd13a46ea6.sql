REVOKE ALL ON FUNCTION public.on_travel_presence_chat() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.on_travel_presence_chat() FROM anon;
REVOKE ALL ON FUNCTION public.on_travel_presence_chat() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.on_travel_presence_chat() TO service_role;