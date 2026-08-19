-- 20260726121500_close_world_read_rls.sql tightened minyan_participants SELECT
-- to "own rows only". That broke two trigger functions that recompute
-- present_count by counting ALL participants for a minyan — they are plain
-- SECURITY INVOKER, so under the new RLS each trigger only ever sees the
-- *acting* user's own participation row.
--
-- Concretely: sync_minyan_count fires AFTER INSERT/DELETE on
-- minyan_participants (i.e. every join/leave) and recomputes
-- minyanim.present_count from `COUNT(*) FROM minyan_participants WHERE
-- minyan_id = ...`; enforce_minyan_constraints does the same on UPDATE of
-- minyanim itself. Both ran as the joining/leaving user, so the COUNT(*)
-- was silently clipped to 1 (that user's own row) by RLS instead of the
-- real participant count — verified live: a minyan with 2 real
-- participants was left showing present_count = 1 after the second join.
-- Every minyan with more than one participant has had a wrong headcount
-- (and wrong "X missing" / minyan-ready state) since that migration.
--
-- Fix: both are pure aggregate/derived-count logic with no user-controlled
-- filter to bypass — safe to run as SECURITY DEFINER so they see every
-- participant row regardless of who triggered them.

CREATE OR REPLACE FUNCTION public.sync_minyan_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.minyanim
      SET present_count = (SELECT COUNT(*) FROM public.minyan_participants WHERE minyan_id = NEW.minyan_id) + COALESCE(extra_present, 0)
      WHERE id = NEW.minyan_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.minyanim
      SET present_count = (SELECT COUNT(*) FROM public.minyan_participants WHERE minyan_id = OLD.minyan_id) + COALESCE(extra_present, 0)
      WHERE id = OLD.minyan_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_minyan_constraints()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _max_expiry timestamptz;
  _extra integer;
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

    -- Don't trust client present_count. Seed from extra_present only —
    -- participants aren't inserted yet at this moment. sync_minyan_count
    -- will add the creator (+1) right after.
    _extra := GREATEST(0, COALESCE(NEW.extra_present, 0));
    NEW.extra_present := _extra;
    NEW.present_count := _extra;

    IF NEW.expires_at IS NULL OR NEW.expires_at > _max_expiry THEN
      NEW.expires_at := _max_expiry;
    END IF;
    IF NEW.expires_at <= now() THEN
      RAISE EXCEPTION 'expires_at must be in the future';
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    NEW.creator_id := OLD.creator_id;
    -- Recompute server-side so clients can't spoof the headcount,
    -- and so sync_minyan_count's UPDATE is not overwritten with OLD (0).
    _extra := GREATEST(0, COALESCE(NEW.extra_present, OLD.extra_present, 0));
    NEW.extra_present := _extra;
    NEW.present_count := (
      SELECT COUNT(*)::int FROM public.minyan_participants WHERE minyan_id = NEW.id
    ) + _extra;

    IF NEW.expires_at IS NULL THEN
      NEW.expires_at := OLD.expires_at;
    ELSIF NEW.expires_at > _max_expiry THEN
      NEW.expires_at := _max_expiry;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- One-off backfill: repair present_count for every currently-live minyan
-- whose stored value drifted from the real participant count while these
-- triggers were broken.
UPDATE public.minyanim m
SET present_count = COALESCE((
  SELECT COUNT(*) FROM public.minyan_participants p WHERE p.minyan_id = m.id
), 0) + COALESCE(m.extra_present, 0)
WHERE m.expires_at > now();
