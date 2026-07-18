-- Scheduled minyanim: visible on the nearby map from creation (chosen location),
-- not only in the ±30 min live window. Anti-duplicate (±200 m, ±30 min) also
-- applies to type = 'scheduled'.

CREATE OR REPLACE FUNCTION public.nearby_minyanim(
  lat double precision,
  lng double precision,
  radius_m integer DEFAULT 1000
)
RETURNS SETOF public.minyanim
LANGUAGE sql
STABLE
SECURITY INVOKER
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
