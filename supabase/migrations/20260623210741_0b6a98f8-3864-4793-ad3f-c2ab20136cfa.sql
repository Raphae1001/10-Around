
ALTER TABLE public.minyanim ADD COLUMN IF NOT EXISTS extra_present integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.enforce_minyan_constraints()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _start timestamptz;
  _extra integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.creator_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'creator_id must match auth.uid()';
    END IF;
    _extra := COALESCE(NEW.extra_present, 0);
    NEW.present_count := COALESCE((
      SELECT COUNT(*)::int FROM public.minyan_participants WHERE minyan_id = NEW.id
    ), 0) + _extra;
    _start := COALESCE(NEW.scheduled_at, now());
    NEW.expires_at := _start + interval '40 minutes';
    IF NEW.expires_at <= now() THEN
      RAISE EXCEPTION 'expires_at must be in the future (start time too far in the past)';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.creator_id := OLD.creator_id;
    _extra := COALESCE(NEW.extra_present, OLD.extra_present, 0);
    NEW.present_count := COALESCE((
      SELECT COUNT(*)::int FROM public.minyan_participants WHERE minyan_id = NEW.id
    ), 0) + _extra;
    _start := COALESCE(NEW.scheduled_at, OLD.scheduled_at, OLD.created_at);
    NEW.expires_at := _start + interval '40 minutes';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_minyan_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.minyanim
      SET present_count = (SELECT COUNT(*) FROM public.minyan_participants WHERE minyan_id = NEW.minyan_id) + COALESCE(extra_present, 0)
      WHERE id = NEW.minyan_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.minyanim
      SET present_count = (SELECT COUNT(*) FROM public.minyan_participants WHERE minyan_id = OLD.minyan_id) + COALESCE(extra_present, 0)
      WHERE id = OLD.minyan_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;
