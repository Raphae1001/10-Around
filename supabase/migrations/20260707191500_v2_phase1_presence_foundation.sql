-- MinyanNow v2 — Phase 1 : fondations présence floutée + config serveur + enum minyan_type
-- Aucun changement UI. Présence isolée hors profiles (SELECT permissif sur profiles).

-- =============================================================================
-- 1. app_config (seuils lus par les RPC, jamais en dur)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

INSERT INTO public.app_config (key, value) VALUES
  ('presence_freshness_minutes', '180'),
  ('density_min_threshold', '3'),
  ('notif_daily_cap', '3'),
  ('creation_window_minutes', '60')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_app_config_int(_key text, _default integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _raw jsonb;
BEGIN
  SELECT value INTO _raw FROM public.app_config WHERE key = _key;
  IF _raw IS NULL THEN
    RETURN _default;
  END IF;
  IF jsonb_typeof(_raw) = 'number' THEN
    RETURN (_raw #>> '{}')::integer;
  END IF;
  RETURN COALESCE((_raw #>> '{}')::integer, _default);
END;
$$;

REVOKE ALL ON FUNCTION public.get_app_config_int(text, integer) FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 2. member_presence (aucune policy SELECT — lecture agrégée via RPC definer)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.member_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  zone text NOT NULL CHECK (zone ~ '^[0-9b-hjkmnp-tvw-z]{6}$'),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  opt_out boolean NOT NULL DEFAULT false,
  presence_level text NOT NULL DEFAULT 'ponctual'
    CHECK (presence_level IN ('off', 'ponctual', 'active_foreground')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_presence_zone_last_seen_idx
  ON public.member_presence (zone, last_seen_at DESC)
  WHERE opt_out = false AND presence_level <> 'off';

ALTER TABLE public.member_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own presence"
  ON public.member_presence FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
  ON public.member_presence FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own presence"
  ON public.member_presence FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT INSERT, UPDATE, DELETE ON public.member_presence TO authenticated;
GRANT ALL ON public.member_presence TO service_role;

DROP TRIGGER IF EXISTS member_presence_touch_updated_at ON public.member_presence;
CREATE TRIGGER member_presence_touch_updated_at
  BEFORE UPDATE ON public.member_presence
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =============================================================================
-- 3. Helpers geohash internes (filtrage rayon côté serveur, jamais exposés au client)
--    Le client décode le geohash lui-même (ngeohash) en Phase 2.
--    Les RPC ne renvoient QUE le texte du geohash + des comptes, jamais de lat/lng.
-- =============================================================================
CREATE OR REPLACE FUNCTION public._geohash6_encode(lat double precision, lng double precision)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _base32 constant text := '0123456789bcdefghjkmnpqrstuvwxyz';
  _lat_lo double precision := -90.0;
  _lat_hi double precision := 90.0;
  _lng_lo double precision := -180.0;
  _lng_hi double precision := 180.0;
  _bit integer := 0;
  _ch integer := 0;
  _even boolean := true;
  _mid double precision;
  _hash text := '';
BEGIN
  WHILE length(_hash) < 6 LOOP
    FOR _bit IN 0..4 LOOP
      IF _even THEN
        _mid := (_lng_lo + _lng_hi) / 2.0;
        IF lng >= _mid THEN
          _ch := _ch | (1 << (4 - _bit));
          _lng_lo := _mid;
        ELSE
          _lng_hi := _mid;
        END IF;
      ELSE
        _mid := (_lat_lo + _lat_hi) / 2.0;
        IF lat >= _mid THEN
          _ch := _ch | (1 << (4 - _bit));
          _lat_lo := _mid;
        ELSE
          _lat_hi := _mid;
        END IF;
      END IF;
      _even := NOT _even;
    END LOOP;
    _hash := _hash || substr(_base32, _ch + 1, 1);
    _ch := 0;
  END LOOP;
  RETURN _hash;
END;
$$;

CREATE OR REPLACE FUNCTION public._geohash6_decode_center(
  _zone text,
  OUT lat double precision,
  OUT lng double precision
)
RETURNS record
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _base32 constant text := '0123456789bcdefghjkmnpqrstuvwxyz';
  _c char;
  _cd integer;
  _lat_lo double precision := -90.0;
  _lat_hi double precision := 90.0;
  _lng_lo double precision := -180.0;
  _lng_hi double precision := 180.0;
  _even boolean := true;
  _i integer;
  _bit integer;
BEGIN
  FOR _i IN 1..length(_zone) LOOP
    _c := substr(_zone, _i, 1);
    _cd := strpos(_base32, _c) - 1;
    IF _cd < 0 THEN
      RAISE EXCEPTION 'invalid geohash zone: %', _zone;
    END IF;
    FOR _bit IN REVERSE 4..0 LOOP
      IF (_cd & (1 << _bit)) <> 0 THEN
        IF _even THEN
          _lng_lo := (_lng_lo + _lng_hi) / 2.0;
        ELSE
          _lat_lo := (_lat_lo + _lat_hi) / 2.0;
        END IF;
      ELSE
        IF _even THEN
          _lng_hi := (_lng_lo + _lng_hi) / 2.0;
        ELSE
          _lat_hi := (_lat_lo + _lat_hi) / 2.0;
        END IF;
      END IF;
      _even := NOT _even;
    END LOOP;
  END LOOP;
  lat := (_lat_lo + _lat_hi) / 2.0;
  lng := (_lng_lo + _lng_hi) / 2.0;
END;
$$;

CREATE OR REPLACE FUNCTION public._geohash6_zones_in_radius(
  lat double precision,
  lng double precision,
  radius_m integer
)
RETURNS TABLE(zone text)
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  _center text;
  _candidate text;
  _decoded record;
  _dist double precision;
BEGIN
  _center := public._geohash6_encode(lat, lng);

  FOR _candidate IN
    SELECT DISTINCT mp.zone
    FROM public.member_presence mp
    WHERE mp.opt_out = false
      AND mp.presence_level <> 'off'
      AND left(mp.zone, 3) = left(_center, 3)
  LOOP
    SELECT * INTO _decoded FROM public._geohash6_decode_center(_candidate);
    _dist := extensions.ST_Distance(
      extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
      extensions.ST_SetSRID(extensions.ST_MakePoint(_decoded.lng, _decoded.lat), 4326)::extensions.geography
    );
    IF _dist <= radius_m THEN
      zone := _candidate;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public._geohash6_encode(double precision, double precision) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._geohash6_decode_center(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._geohash6_zones_in_radius(double precision, double precision, integer) FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 4. RPC présence
-- =============================================================================
-- upsert_presence : le client n'envoie QUE le geohash (jamais lat/lng).
CREATE OR REPLACE FUNCTION public.upsert_presence(zone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _opt_out boolean;
  _level text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF zone IS NULL OR zone !~ '^[0-9b-hjkmnp-tvw-z]{6}$' THEN
    RAISE EXCEPTION 'invalid geohash zone (precision 6 required)';
  END IF;

  SELECT mp.opt_out, mp.presence_level
    INTO _opt_out, _level
  FROM public.member_presence mp
  WHERE mp.user_id = _uid;

  -- Respecte opt_out / presence_level 'off' : no-op silencieux
  IF COALESCE(_opt_out, false) OR COALESCE(_level, 'ponctual') = 'off' THEN
    RETURN;
  END IF;

  INSERT INTO public.member_presence (user_id, zone, last_seen_at, opt_out, presence_level)
  VALUES (_uid, zone, now(), false, COALESCE(_level, 'ponctual'))
  ON CONFLICT (user_id) DO UPDATE
    SET zone = EXCLUDED.zone,
        last_seen_at = now(),
        updated_at = now();
END;
$$;

-- zone_density : agrégat par zone, fraîcheur + seuil depuis app_config, jamais sous le seuil.
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
      public.get_app_config_int('presence_freshness_minutes', 180) AS freshness_min,
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

-- active_members_count : total honnête sur les zones qualifiantes (>= seuil) dans le rayon.
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
      public.get_app_config_int('presence_freshness_minutes', 180) AS freshness_min,
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
  WHERE mp.opt_out = false
    AND mp.presence_level <> 'off'
    AND mp.last_seen_at > now() - (cfg.freshness_min || ' minutes')::interval;
$$;

REVOKE ALL ON FUNCTION public.upsert_presence(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.zone_density(double precision, double precision, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.active_members_count(double precision, double precision, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.upsert_presence(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.zone_density(double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_members_count(double precision, double precision, integer) TO authenticated;

-- =============================================================================
-- 5. Migration enum minyan_type : street | stay | scheduled
--    Mapping : airport→street, hotel→scheduled, travel→stay
-- =============================================================================

-- Sécurité : les voyages vivent désormais dans travel_presence (cf. 20260624194231).
-- Ce DELETE est idempotent : sans lignes 'travel' résiduelles, il ne fait rien.
DELETE FROM public.minyanim WHERE type::text = 'travel';

CREATE TYPE public.minyan_type_new AS ENUM ('street', 'stay', 'scheduled');

ALTER TABLE public.minyanim
  ALTER COLUMN type TYPE public.minyan_type_new
  USING (
    CASE type::text
      WHEN 'airport' THEN 'street'::public.minyan_type_new
      WHEN 'hotel' THEN 'scheduled'::public.minyan_type_new
      WHEN 'travel' THEN 'stay'::public.minyan_type_new
      WHEN 'street' THEN 'street'::public.minyan_type_new
      ELSE 'street'::public.minyan_type_new
    END
  );

DROP TYPE public.minyan_type;
ALTER TYPE public.minyan_type_new RENAME TO minyan_type;

-- Contraintes serveur : scheduled/stay = 30j max, street = 6h max
CREATE OR REPLACE FUNCTION public.enforce_minyan_constraints()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _max_expiry timestamptz;
BEGIN
  IF NEW.type IN ('scheduled', 'stay') THEN
    _max_expiry := now() + interval '30 days';
  ELSE
    _max_expiry := now() + interval '6 hours';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.creator_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'creator_id must match auth.uid()';
    END IF;
    NEW.present_count := 0;
    IF NEW.expires_at IS NULL OR NEW.expires_at > _max_expiry THEN
      NEW.expires_at := _max_expiry;
    END IF;
    IF NEW.expires_at <= now() THEN
      RAISE EXCEPTION 'expires_at must be in the future';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.creator_id := OLD.creator_id;
    NEW.present_count := OLD.present_count;
    IF NEW.expires_at IS NULL THEN
      NEW.expires_at := OLD.expires_at;
    ELSIF NEW.expires_at > _max_expiry THEN
      NEW.expires_at := _max_expiry;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Legacy : chat "ville" auto pour type travel — désactivé (les séjours passent par travel_presence)
CREATE OR REPLACE FUNCTION public.on_travel_minyan_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- nearby_minyanim : street (live + radius) OU scheduled (toujours visible)
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
      (type = 'street' AND extensions.ST_DWithin(
        location,
        extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
        radius_m
      ))
      OR type = 'scheduled'
    )
  ORDER BY created_at DESC;
$function$;

-- count_minyanim_within : anti-doublon live sur street uniquement
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
    AND type = 'street'
    AND ABS(EXTRACT(EPOCH FROM (COALESCE(scheduled_at, created_at) - _start))) < 30 * 60
    AND extensions.ST_DWithin(
      location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography,
      radius_m
    );
$function$;

REVOKE EXECUTE ON FUNCTION public.nearby_minyanim(double precision, double precision, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nearby_minyanim(double precision, double precision, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.count_minyanim_within(double precision, double precision, integer, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_minyanim_within(double precision, double precision, integer, timestamptz) TO authenticated;
