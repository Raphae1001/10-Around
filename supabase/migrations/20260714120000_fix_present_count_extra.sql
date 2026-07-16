-- Fix present_count stuck at 0.
-- Phase 1 rewrote enforce_minyan_constraints to FORCE present_count := 0 on INSERT
-- and lock NEW.present_count := OLD.present_count on UPDATE. That blocked
-- sync_minyan_count (which fires after participant insert) from ever raising the
-- count, and discarded the creator's extra_present ("we're already N").
--
-- Restore server-side recomputation: present_count = participants + extra_present,
-- while keeping Phase 1 expiry rules (street ≤ 6h, scheduled/stay ≤ 30d).

CREATE OR REPLACE FUNCTION public.enforce_minyan_constraints()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- Heal already-broken rows (present_count stuck at 0 while people / extras exist).
UPDATE public.minyanim m
SET present_count = (
  SELECT COUNT(*)::int FROM public.minyan_participants p WHERE p.minyan_id = m.id
) + COALESCE(m.extra_present, 0)
WHERE m.expires_at > now()
  AND m.present_count IS DISTINCT FROM (
    (SELECT COUNT(*)::int FROM public.minyan_participants p WHERE p.minyan_id = m.id)
    + COALESCE(m.extra_present, 0)
  );
