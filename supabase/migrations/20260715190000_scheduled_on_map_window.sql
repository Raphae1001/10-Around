-- Scheduled minyanim appear in nearby_* (map/list) only within ±30 min of scheduled_at,
-- and only inside the geo radius (same as street). Far-future planned stay on Planned only.

CREATE OR REPLACE FUNCTION public.nearby_minyanim(
  lat double precision,
  lng double precision,
  radius_m integer DEFAULT 1000
)
RETURNS SETOF public.minyanim
LANGUAGE sql
STABLE
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
        AND scheduled_at BETWEEN (now() - interval '30 minutes') AND (now() + interval '30 minutes')
        AND extensions.ST_DWithin(
          location,
          extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
          radius_m
        )
      )
    )
  ORDER BY created_at DESC;
$function$;

REVOKE EXECUTE ON FUNCTION public.nearby_minyanim(double precision, double precision, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nearby_minyanim(double precision, double precision, integer) TO authenticated;
