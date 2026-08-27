-- create.tsx's publish() does two separate round-trips — count_minyanim_within
-- (read) then INSERT INTO minyanim (write) — with real client-server latency
-- in between. Two rapid clicks on "Publish minyan" (mobile double-tap, or an
-- impatient re-tap after a slow response) can both pass the duplicate check
-- before either has inserted, creating two near-identical street minyanim.
--
-- Fix: fold the check + insert into one atomic RPC, serialized per creator
-- via a transaction-scoped advisory lock keyed on creator_id. This blocks a
-- second concurrent attempt from the SAME user until the first commits (at
-- which point its own duplicate check correctly sees the just-inserted row)
-- — it never blocks two different users creating distinct minyanim nearby,
-- since the lock key is the caller's own uid, not a shared geographic cell.
--
-- SECURITY DEFINER is required for the same reason nearby_minyanim/
-- count_minyanim_within already are (20260819170000): the duplicate check
-- must see every live minyan regardless of creator, which the tightened
-- minyanim SELECT policy would otherwise hide. creator_id is still always
-- set from auth.uid() (never client-supplied), and enforce_minyan_constraints
-- independently re-validates it on INSERT — same double safety as every
-- other write path.
CREATE OR REPLACE FUNCTION public.create_street_minyan(
  _prayer public.minyan_prayer,
  _message text,
  _address text,
  _lat double precision,
  _lng double precision,
  _scheduled_at timestamptz,
  _extra_present integer,
  _expires_at timestamptz
)
RETURNS SETOF public.minyanim
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _start timestamptz := COALESCE(_scheduled_at, now());
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Released automatically at transaction end. Blocks only this same user's
  -- concurrent calls; a different creator_id hashes to a different lock.
  PERFORM pg_advisory_xact_lock(hashtext(_uid::text));

  IF public.count_minyanim_within(_lat, _lng, 200, _start) > 0 THEN
    RAISE EXCEPTION 'duplicate_nearby';
  END IF;

  RETURN QUERY
  INSERT INTO public.minyanim (
    creator_id, type, prayer, message, address, latitude, longitude,
    is_live, scheduled_at, extra_present, expires_at
  )
  VALUES (
    _uid, 'street', _prayer, _message, _address, _lat, _lng,
    true, _scheduled_at, GREATEST(0, _extra_present), _expires_at
  )
  RETURNING *;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_street_minyan(
  public.minyan_prayer, text, text, double precision, double precision,
  timestamptz, integer, timestamptz
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_street_minyan(
  public.minyan_prayer, text, text, double precision, double precision,
  timestamptz, integer, timestamptz
) TO authenticated;
