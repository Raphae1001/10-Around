-- Presence counting: only live accounts seen recently.
-- Default freshness 20 min (was 180) — matches "active while sharing / app open".
-- Density/count RPCs require the auth user to still exist (orphan rows ignored).

INSERT INTO public.app_config (key, value)
VALUES
  ('presence_freshness_minutes', '20'::jsonb),
  ('density_min_threshold', '3'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Drop stale presence rows (older than freshness window).
DELETE FROM public.member_presence
WHERE last_seen_at < now() - interval '20 minutes';

CREATE OR REPLACE FUNCTION public.zone_density(
  lat double precision,
  lng double precision,
  radius_m integer DEFAULT 5000
)
RETURNS TABLE(zone text, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cfg AS (
    SELECT
      public.get_app_config_int('presence_freshness_minutes', 20) AS freshness_min,
      public.get_app_config_int('density_min_threshold', 3) AS min_threshold
  ),
  zones_in_radius AS (
    SELECT z.zone FROM public._geohash6_zones_in_radius(lat, lng, radius_m) z
  ),
  aggregated AS (
    SELECT mp.zone, COUNT(*)::bigint AS member_count
    FROM public.member_presence mp
    CROSS JOIN cfg
    INNER JOIN zones_in_radius zir ON zir.zone = mp.zone
    INNER JOIN auth.users u ON u.id = mp.user_id
    WHERE mp.opt_out = false
      AND mp.presence_level <> 'off'
      AND mp.last_seen_at > now() - (cfg.freshness_min || ' minutes')::interval
    GROUP BY mp.zone
    HAVING COUNT(*) >= (SELECT min_threshold FROM cfg)
  )
  SELECT aggregated.zone, aggregated.member_count
  FROM aggregated
  ORDER BY aggregated.member_count DESC, aggregated.zone;
$$;

CREATE OR REPLACE FUNCTION public.active_members_count(
  lat double precision,
  lng double precision,
  radius_m integer DEFAULT 5000
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cfg AS (
    SELECT
      public.get_app_config_int('presence_freshness_minutes', 20) AS freshness_min,
      public.get_app_config_int('density_min_threshold', 3) AS min_threshold
  ),
  zones_in_radius AS (
    SELECT z.zone FROM public._geohash6_zones_in_radius(lat, lng, radius_m) z
  ),
  qualifying_zones AS (
    SELECT mp.zone
    FROM public.member_presence mp
    CROSS JOIN cfg
    INNER JOIN zones_in_radius zir ON zir.zone = mp.zone
    INNER JOIN auth.users u ON u.id = mp.user_id
    WHERE mp.opt_out = false
      AND mp.presence_level <> 'off'
      AND mp.last_seen_at > now() - (cfg.freshness_min || ' minutes')::interval
    GROUP BY mp.zone
    HAVING COUNT(*) >= (SELECT min_threshold FROM cfg)
  )
  SELECT COUNT(*)::bigint
  FROM public.member_presence mp
  CROSS JOIN cfg
  INNER JOIN qualifying_zones qz ON qz.zone = mp.zone
  INNER JOIN auth.users u ON u.id = mp.user_id
  WHERE mp.opt_out = false
    AND mp.presence_level <> 'off'
    AND mp.last_seen_at > now() - (cfg.freshness_min || ' minutes')::interval;
$$;

-- Keep grants (CREATE OR REPLACE preserves ownership but reaffirm).
REVOKE ALL ON FUNCTION public.zone_density(double precision, double precision, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.active_members_count(double precision, double precision, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zone_density(double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_members_count(double precision, double precision, integer) TO authenticated;
