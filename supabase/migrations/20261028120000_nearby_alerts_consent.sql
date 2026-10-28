-- Nearby minyan alerts: explicit, revocable consent. A user's blurred zone
-- (geohash6, ~1 km) is stored ONLY after they opted in, and it is used ONLY by
-- the server to decide who gets a push when a minyan starts nearby. It is never
-- shown to other users.

-- 1. Opt in (or refresh the zone of an opted-in user) / opt out.
--    Opting out deletes the stored zone entirely.
CREATE OR REPLACE FUNCTION public.set_nearby_alerts(_enabled boolean, _zone text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT _enabled THEN
    DELETE FROM public.member_presence WHERE user_id = _uid;
    RETURN;
  END IF;

  IF _zone IS NULL OR _zone !~ '^[0-9b-hjkmnp-tvw-z]{6}$' THEN
    RAISE EXCEPTION 'invalid geohash zone (precision 6 required)';
  END IF;

  INSERT INTO public.member_presence (user_id, zone, last_seen_at, opt_out, presence_level)
  VALUES (_uid, _zone, now(), false, 'ponctual')
  ON CONFLICT (user_id) DO UPDATE
    SET zone = EXCLUDED.zone,
        last_seen_at = now(),
        updated_at = now(),
        opt_out = false,
        presence_level = 'ponctual';
END;
$$;

REVOKE ALL ON FUNCTION public.set_nearby_alerts(boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_nearby_alerts(boolean, text) TO authenticated;

-- 2. Older app builds still call upsert_presence(). It must never create a row
--    for someone who has not opted in: no row = no consent = no-op.
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
  _has_row boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF zone IS NULL OR zone !~ '^[0-9b-hjkmnp-tvw-z]{6}$' THEN
    RAISE EXCEPTION 'invalid geohash zone (precision 6 required)';
  END IF;

  SELECT true, mp.opt_out, mp.presence_level
    INTO _has_row, _opt_out, _level
  FROM public.member_presence mp
  WHERE mp.user_id = _uid;

  IF NOT COALESCE(_has_row, false) OR COALESCE(_opt_out, false) OR _level = 'off' THEN
    RETURN;
  END IF;

  UPDATE public.member_presence
     SET zone = upsert_presence.zone,
         last_seen_at = now(),
         updated_at = now()
   WHERE user_id = _uid;
END;
$$;

-- 3. A stored zone stays valid until the user opts out or the account is
--    deleted: drop the freshness window from the push recipient lookup.
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
  WITH zones AS (
    SELECT z.zone FROM public._geohash6_zones_in_radius(_lat, _lng, _radius_m) z
  )
  SELECT DISTINCT ON (t.token)
    t.user_id,
    t.token
  FROM public.user_push_tokens t
  INNER JOIN public.member_presence mp ON mp.user_id = t.user_id
  INNER JOIN zones z ON z.zone = mp.zone
  WHERE mp.opt_out = false
    AND mp.presence_level <> 'off'
    AND (_exclude_user_id IS NULL OR t.user_id <> _exclude_user_id)
  ORDER BY t.token, t.updated_at DESC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION public.nearby_push_recipients(double precision, double precision, integer, uuid)
  FROM PUBLIC, anon, authenticated;

-- 4. The every-5-minutes cleanup used to delete zones older than the freshness
--    window. It now only removes rows that should not exist (opted out / off).
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted integer;
BEGIN
  DELETE FROM public.member_presence
  WHERE opt_out = true OR presence_level = 'off';
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;

-- 5. Nothing may display other people's presence any more: the aggregated
--    zone counts are no longer callable from the app.
REVOKE EXECUTE ON FUNCTION public.zone_density(double precision, double precision, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.active_members_count(double precision, double precision, integer)
  FROM PUBLIC, anon, authenticated;

-- 6. Whether the caller has opted in (so the app can show the right setting
--    even after a reinstall).
CREATE OR REPLACE FUNCTION public.my_nearby_alerts()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_presence
    WHERE user_id = auth.uid() AND opt_out = false AND presence_level <> 'off'
  );
$$;

REVOKE ALL ON FUNCTION public.my_nearby_alerts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_nearby_alerts() TO authenticated;
