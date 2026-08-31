-- Étape 23 — two independent fixes for the Stay (travel) flow, now that
-- Travel/Stay is being re-enabled as a real product feature:
--
-- 1) trigger_due_confirmations() (the retrospective "did it happen?" /
--    trust-score survey — a different system from check_minyan_confirmation(),
--    which already correctly limits itself to type = 'street') has no type
--    filter at all. Its "due" condition is
--    COALESCE(scheduled_at, created_at) <= now(): correct for 'street'
--    (scheduled_at is null, so it falls back to created_at — a street
--    minyan is due the instant it's created) and correct for 'scheduled'
--    (scheduled_at is the real due instant). For 'stay', scheduled_at is
--    also always null (a multi-day trip has no single "due instant"), so
--    it falls back to created_at too — meaning every stay is "due" the
--    moment it's created, regardless of trip_start_date/trip_end_date,
--    triggering an irrelevant "Did the minyan start?" prompt for a
--    multi-day city presence. Fix: restrict this system to the two types
--    that represent an actual bounded prayer event.
--
-- 2) create-stay.tsx's SELECT (duplicate check) → INSERT minyanim →
--    INSERT minyan_participants is not atomic: two genuinely concurrent
--    requests (two tabs, a retry after a perceived timeout) can both pass
--    the duplicate check before either insert is visible to the other.
--    Fix: create_stay_minyan(), a SECURITY DEFINER RPC mirroring
--    create_street_minyan's atomic-transaction + advisory-lock shape,
--    adapted to Stay's own duplicate rule (creator + city key + date-range
--    overlap — no geographic radius, unlike the street flow) and doing
--    both inserts in the same transaction so a failed participant insert
--    rolls back the stay too.

-- =============================================================================
-- 1) trigger_due_confirmations(): exclude 'stay'.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.trigger_due_confirmations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _count integer := 0; _m record;
BEGIN
  FOR _m IN
    SELECT m.id FROM public.minyanim m
    WHERE m.type IN ('street', 'scheduled')
      AND m.expires_at > now()
      AND COALESCE(m.scheduled_at, m.created_at) <= now()
      AND NOT EXISTS (SELECT 1 FROM public.minyan_confirmations c WHERE c.minyan_id = m.id)
  LOOP
    PERFORM public.request_confirmations(_m.id);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END; $function$;

-- =============================================================================
-- 2) create_stay_minyan(): atomic duplicate-check + insert + participant.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_stay_minyan(
  _address text,
  _lat double precision,
  _lng double precision,
  _message text,
  _trip_start_date date,
  _trip_end_date date,
  _trip_prayer_interests jsonb,
  _expires_at timestamptz
)
RETURNS SETOF public.minyanim
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _city_key text;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _address IS NULL OR btrim(_address) = '' THEN
    RAISE EXCEPTION 'address required';
  END IF;
  IF _trip_start_date IS NULL OR _trip_end_date IS NULL THEN
    RAISE EXCEPTION 'trip dates required';
  END IF;
  IF _trip_end_date < _trip_start_date THEN
    RAISE EXCEPTION 'trip_end_date must be on or after trip_start_date';
  END IF;

  -- Advisory lock namespaced to this function specifically (the two-int
  -- form uses a numeric space entirely separate from the single-bigint
  -- form create_street_minyan already uses, per PostgreSQL's own docs —
  -- so this can never collide with that lock regardless of hash values),
  -- keyed within that namespace by the creator. Serializes only this same
  -- user's own concurrent create_stay_minyan calls; a different creator_id
  -- hashes to a different key and is never blocked by this.
  PERFORM pg_advisory_xact_lock(hashtext('create_stay_minyan')::int, hashtext(_uid::text)::int);

  _city_key := public.stay_city_key(_address);

  IF EXISTS (
    SELECT 1 FROM public.minyanim m
    WHERE m.creator_id = _uid
      AND m.type = 'stay'
      AND m.expires_at > now()
      AND public.stay_city_key(m.address) = _city_key
      AND m.trip_start_date <= _trip_end_date
      AND m.trip_end_date >= _trip_start_date
  ) THEN
    RAISE EXCEPTION 'duplicate_stay';
  END IF;

  INSERT INTO public.minyanim (
    creator_id, type, prayer, message, address, latitude, longitude,
    is_live, trip_start_date, trip_end_date, trip_prayer_interests,
    expires_at, present_count, extra_present
  )
  VALUES (
    _uid, 'stay', 'mincha', _message, _address, _lat, _lng,
    false, _trip_start_date, _trip_end_date, _trip_prayer_interests,
    _expires_at, 0, 0
  )
  RETURNING id INTO _new_id;

  -- If this fails, the exception rolls back the minyanim insert above too —
  -- no partially-created stay, matching the atomicity create_street_minyan
  -- already guarantees for the street flow.
  INSERT INTO public.minyan_participants (minyan_id, user_id)
  VALUES (_new_id, _uid);

  RETURN QUERY SELECT * FROM public.minyanim WHERE id = _new_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_stay_minyan(
  text, double precision, double precision, text, date, date, jsonb, timestamptz
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_stay_minyan(
  text, double precision, double precision, text, date, date, jsonb, timestamptz
) TO authenticated;
