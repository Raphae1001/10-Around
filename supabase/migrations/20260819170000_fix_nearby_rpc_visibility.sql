-- 20260726121500_close_world_read_rls.sql tightened the `minyanim` SELECT
-- policy from a blanket `USING (true)` to "creator or participant only".
-- That was the right fix for direct REST/table access, but nearby_minyanim
-- and count_minyanim_within are SECURITY INVOKER, so they run under that
-- same tightened RLS — meaning every user stopped seeing minyanim created
-- by anyone else on the map (and the duplicate-check RPC stopped seeing
-- them too, so overlapping minyanim would no longer collide).
--
-- Both RPCs are already bounded (radius + expires_at, never a blanket scan)
-- and already grant-restricted to `authenticated` only (anon revoked) —
-- exactly the pattern the security migration itself used for
-- get_minyan_by_id/public_minyan_summary. Making them SECURITY DEFINER
-- restores that intended scoped-read behavior without reopening the
-- unbounded read the RLS change closed.

CREATE OR REPLACE FUNCTION public.nearby_minyanim(
  lat double precision,
  lng double precision,
  radius_m integer DEFAULT 1000
)
RETURNS SETOF public.minyanim
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT *
  FROM public.minyanim
  WHERE expires_at > now()
    AND (
      (
        type = 'street'
        AND extensions.ST_DWithin(
          location,
          extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
          radius_m
        )
      )
      OR (
        type = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND extensions.ST_DWithin(
          location,
          extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
          radius_m
        )
      )
    )
  ORDER BY created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.count_minyanim_within(
  lat double precision,
  lng double precision,
  radius_m integer DEFAULT 200,
  _start timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT COUNT(*)::int
  FROM public.minyanim
  WHERE expires_at > now()
    AND type IN ('street', 'scheduled')
    AND ABS(EXTRACT(EPOCH FROM (COALESCE(scheduled_at, created_at) - _start))) < 30 * 60
    AND extensions.ST_DWithin(
      location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
      radius_m
    );
$function$;

-- prosecdef flips the owner-privilege behavior of REVOKE/GRANT tracking in
-- some Postgres versions; reassert the authenticated-only, no-anon grant
-- explicitly rather than relying on what CREATE OR REPLACE preserved.
REVOKE ALL ON FUNCTION public.nearby_minyanim(double precision, double precision, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nearby_minyanim(double precision, double precision, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.count_minyanim_within(double precision, double precision, integer, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_minyanim_within(double precision, double precision, integer, timestamptz) TO authenticated;
