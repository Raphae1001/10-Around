-- Presence freshness = 1 hour; purge stale rows; nearby push recipient lookup.

INSERT INTO public.app_config (key, value)
VALUES
  ('presence_freshness_minutes', '60'::jsonb),
  ('density_min_threshold', '1'::jsonb),
  ('notif_radius_m', '1000'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Hard-delete presence older than freshness so people disappear from counts.
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _minutes integer := public.get_app_config_int('presence_freshness_minutes', 60);
  _deleted integer;
BEGIN
  DELETE FROM public.member_presence
  WHERE last_seen_at < now() - (_minutes || ' minutes')::interval;
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_stale_presence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_presence() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-stale-presence');
EXCEPTION WHEN OTHERS THEN
  NULL; -- job may not exist yet
END $$;

SELECT cron.schedule(
  'cleanup-stale-presence',
  '*/5 * * * *',
  $$SELECT public.cleanup_stale_presence();$$
);

-- Recipients: accepted push (token row) + presence within radius + fresh (<1h).
CREATE OR REPLACE FUNCTION public.nearby_push_recipients(
  _lat double precision,
  _lng double precision,
  _radius_m integer DEFAULT 1000,
  _exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE(user_id uuid, token text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH cfg AS (
    SELECT public.get_app_config_int('presence_freshness_minutes', 60) AS freshness_min
  ),
  zones AS (
    SELECT z.zone FROM public._geohash6_zones_in_radius(_lat, _lng, _radius_m) z
  )
  SELECT DISTINCT ON (t.token)
    t.user_id,
    t.token
  FROM public.user_push_tokens t
  INNER JOIN public.member_presence mp ON mp.user_id = t.user_id
  INNER JOIN zones z ON z.zone = mp.zone
  CROSS JOIN cfg
  WHERE mp.opt_out = false
    AND mp.presence_level <> 'off'
    AND mp.last_seen_at > now() - (cfg.freshness_min || ' minutes')::interval
    AND (_exclude_user_id IS NULL OR t.user_id <> _exclude_user_id)
  ORDER BY t.token, t.updated_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.nearby_push_recipients(double precision, double precision, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nearby_push_recipients(double precision, double precision, integer, uuid) TO service_role;

-- Optional send log for daily cap / debugging.
CREATE TABLE IF NOT EXISTS public.push_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minyan_id uuid REFERENCES public.minyanim(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'nearby_minyan',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_notification_log_user_day_idx
  ON public.push_notification_log (user_id, created_at DESC);

-- Cap used by edge function notify-nearby-minyan: 3 pushes / user / 6 hours.

ALTER TABLE public.push_notification_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.push_notification_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.push_notification_log TO service_role;
