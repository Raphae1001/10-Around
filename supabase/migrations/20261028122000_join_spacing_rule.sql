-- Joining rule: someone registered to a minyan cannot register to another one
-- unless the two start at least 30 minutes apart. Start time = scheduled_at,
-- or the creation time for a "now" street minyan. Finished minyanim
-- (expires_at in the past) and "stay" (trip) minyanim do not count.
-- The creator's own participant row is created together with the minyan, so
-- the rule is checked for creators by the app before publishing.

CREATE OR REPLACE FUNCTION public.enforce_join_spacing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target public.minyanim;
  _clash_start timestamptz;
BEGIN
  SELECT * INTO _target FROM public.minyanim WHERE id = NEW.minyan_id;
  IF NOT FOUND OR _target.type = 'stay' OR _target.creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(m.scheduled_at, m.created_at)
    INTO _clash_start
  FROM public.minyan_participants p
  JOIN public.minyanim m ON m.id = p.minyan_id
  WHERE p.user_id = NEW.user_id
    AND m.id <> NEW.minyan_id
    AND m.type <> 'stay'
    AND m.expires_at > now()
    AND ABS(EXTRACT(EPOCH FROM (
          COALESCE(m.scheduled_at, m.created_at)
          - COALESCE(_target.scheduled_at, _target.created_at)))) < 1800
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'already_joined_nearby_time'
      USING DETAIL = _clash_start::text;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_join_spacing() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_join_spacing_trg ON public.minyan_participants;
CREATE TRIGGER enforce_join_spacing_trg
  BEFORE INSERT ON public.minyan_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_join_spacing();

-- The caller's own active registrations, used by the app to explain why a
-- "Join" button is disabled and to check before creating a minyan.
CREATE OR REPLACE FUNCTION public.my_active_registrations()
RETURNS TABLE(minyan_id uuid, start_at timestamptz, address text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, COALESCE(m.scheduled_at, m.created_at), m.address
  FROM public.minyan_participants p
  JOIN public.minyanim m ON m.id = p.minyan_id
  WHERE p.user_id = auth.uid()
    AND m.type <> 'stay'
    AND m.expires_at > now();
$$;

REVOKE ALL ON FUNCTION public.my_active_registrations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_active_registrations() TO authenticated;
