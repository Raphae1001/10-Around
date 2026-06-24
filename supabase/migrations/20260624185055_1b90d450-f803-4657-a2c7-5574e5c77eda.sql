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
    AND type IN ('street','airport')
    AND ABS(EXTRACT(EPOCH FROM (COALESCE(scheduled_at, created_at) - _start))) < 30 * 60
    AND extensions.ST_DWithin(
      location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
      radius_m
    );
$function$;