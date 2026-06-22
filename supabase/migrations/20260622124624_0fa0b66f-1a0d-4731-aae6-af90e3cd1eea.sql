
-- Drop dependent objects, move PostGIS to extensions schema, recreate
ALTER TABLE public.minyanim DROP COLUMN IF EXISTS location;
DROP FUNCTION IF EXISTS public.nearby_minyanim(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);
DROP FUNCTION IF EXISTS public.set_minyan_location() CASCADE;

DROP EXTENSION IF EXISTS postgis CASCADE;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;

-- Recreate location column referencing extensions.geography
ALTER TABLE public.minyanim ADD COLUMN location extensions.geography(POINT, 4326);
CREATE INDEX IF NOT EXISTS minyanim_location_idx ON public.minyanim USING GIST (location);

CREATE OR REPLACE FUNCTION public.set_minyan_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  NEW.location := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::extensions.geography;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_minyan_location
  BEFORE INSERT OR UPDATE ON public.minyanim
  FOR EACH ROW EXECUTE FUNCTION public.set_minyan_location();

CREATE OR REPLACE FUNCTION public.nearby_minyanim(lat DOUBLE PRECISION, lng DOUBLE PRECISION, radius_m INTEGER DEFAULT 1000)
RETURNS SETOF public.minyanim
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT *
  FROM public.minyanim
  WHERE expires_at > now()
    AND (
      (type IN ('street', 'airport') AND extensions.ST_DWithin(location, extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography, radius_m))
      OR (type IN ('hotel', 'travel'))
    )
  ORDER BY created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.nearby_minyanim(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nearby_minyanim(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
