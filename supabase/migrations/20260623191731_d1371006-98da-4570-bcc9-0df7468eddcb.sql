
CREATE OR REPLACE FUNCTION public.enforce_minyan_constraints()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _start timestamptz;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.creator_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'creator_id must match auth.uid()';
    END IF;
    -- Always derive present_count from the participants table (0 on fresh insert).
    NEW.present_count := COALESCE((
      SELECT COUNT(*)::int FROM public.minyan_participants WHERE minyan_id = NEW.id
    ), 0);
    _start := COALESCE(NEW.scheduled_at, now());
    NEW.expires_at := _start + interval '40 minutes';
    IF NEW.expires_at <= now() THEN
      RAISE EXCEPTION 'expires_at must be in the future (start time too far in the past)';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Lock sensitive fields except present_count, which the sync trigger maintains.
    NEW.creator_id := OLD.creator_id;
    NEW.present_count := COALESCE((
      SELECT COUNT(*)::int FROM public.minyan_participants WHERE minyan_id = NEW.id
    ), OLD.present_count);
    _start := COALESCE(NEW.scheduled_at, OLD.scheduled_at, OLD.created_at);
    NEW.expires_at := _start + interval '40 minutes';
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill correct counts now.
UPDATE public.minyanim m
SET present_count = COALESCE((
  SELECT COUNT(*)::int FROM public.minyan_participants p WHERE p.minyan_id = m.id
), 0);
