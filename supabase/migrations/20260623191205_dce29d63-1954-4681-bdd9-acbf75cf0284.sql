
-- 1) Update the constraint trigger so expires_at is always start + 40 min.
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
    NEW.present_count := 0;
    _start := COALESCE(NEW.scheduled_at, now());
    NEW.expires_at := _start + interval '40 minutes';
    IF NEW.expires_at <= now() THEN
      RAISE EXCEPTION 'expires_at must be in the future (start time too far in the past)';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.creator_id := OLD.creator_id;
    NEW.present_count := OLD.present_count;
    _start := COALESCE(NEW.scheduled_at, OLD.scheduled_at, OLD.created_at);
    NEW.expires_at := _start + interval '40 minutes';
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Cleanup function — deletes minyanim that have been expired for more than a minute.
CREATE OR REPLACE FUNCTION public.cleanup_expired_minyanim()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.minyanim WHERE expires_at < now() - interval '1 minute';
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_minyanim() FROM public, anon, authenticated;

-- 3) Schedule it every 5 minutes via pg_cron (idempotent).
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-expired-minyanim');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-expired-minyanim',
  '*/5 * * * *',
  $$SELECT public.cleanup_expired_minyanim();$$
);

-- 4) Backfill: align existing rows to the new 40-minute rule.
UPDATE public.minyanim
SET expires_at = COALESCE(scheduled_at, created_at) + interval '40 minutes';
