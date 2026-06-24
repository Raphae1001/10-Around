
-- 1) Revoke anon CRUD across all public tables (RLS already protects, this is defense in depth)
REVOKE ALL ON public.chat_messages FROM anon;
REVOKE ALL ON public.chat_thread_members FROM anon;
REVOKE ALL ON public.chat_threads FROM anon;
REVOKE ALL ON public.minyan_confirmations FROM anon;
REVOKE ALL ON public.minyan_participants FROM anon;
REVOKE ALL ON public.minyanim FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.travel_presence FROM anon;
REVOKE ALL ON public.user_push_tokens FROM anon;

-- 2) Make sure authenticated has the grants it needs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_thread_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.minyan_confirmations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.minyan_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.minyanim TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_presence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_push_tokens TO authenticated;
-- profiles intentionally read via get_my_profile() security definer, keep as-is

-- 3) Travel date sanity trigger (can't use CHECK with now() etc; trigger keeps it consistent)
CREATE OR REPLACE FUNCTION public.validate_travel_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date_start IS NULL OR NEW.date_end IS NULL THEN
    RAISE EXCEPTION 'date_start and date_end are required';
  END IF;
  IF NEW.date_start > NEW.date_end THEN
    RAISE EXCEPTION 'date_start must be on or before date_end';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_travel_dates_trg ON public.travel_presence;
CREATE TRIGGER validate_travel_dates_trg
  BEFORE INSERT OR UPDATE ON public.travel_presence
  FOR EACH ROW EXECUTE FUNCTION public.validate_travel_dates();
