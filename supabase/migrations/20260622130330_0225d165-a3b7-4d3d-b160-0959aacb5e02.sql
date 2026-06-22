
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS backup_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS backup_radius_m integer NOT NULL DEFAULT 1000;

CREATE OR REPLACE FUNCTION public.count_minyanim_within(lat double precision, lng double precision, radius_m integer DEFAULT 200)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT COUNT(*)::int
  FROM public.minyanim
  WHERE expires_at > now()
    AND type IN ('street','airport')
    AND extensions.ST_DWithin(
      location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
      radius_m
    );
$$;

GRANT EXECUTE ON FUNCTION public.count_minyanim_within(double precision, double precision, integer) TO authenticated, anon, service_role;
