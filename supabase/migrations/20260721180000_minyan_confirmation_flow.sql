-- Street minyan confirmation flow — replaces the automatic grace-window
-- (20260720190000) entirely. Registrants choose "ready now" vs "wait for
-- the deadline"; reaching 10 on either path confirms the minyan and starts
-- a 10-minute arrival countdown (immediately for "now", deferred to the
-- original deadline for "wait" — "now" always wins if both thresholds are
-- crossed at any point). If neither reaches 10 by the deadline, the
-- creator is asked to confirm in person or cancel.

-- 1) Retire the old grace mechanic.
DO $$ BEGIN PERFORM cron.unschedule('check-minyan-grace'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP FUNCTION IF EXISTS public.check_minyan_grace();
ALTER TABLE public.minyanim DROP COLUMN IF EXISTS grace_extended;

-- 2) Participant readiness vote, captured at join time. extra_present
--    (manually added by the creator, already physically there) always
--    counts toward "yes" — handled in the state machine below, not here.
ALTER TABLE public.minyan_participants
  ADD COLUMN IF NOT EXISTS ready_now boolean NOT NULL DEFAULT true;

-- 3) Confirmation state on the minyan itself.
ALTER TABLE public.minyanim
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_path text CHECK (confirmation_path IN ('now', 'wait')),
  ADD COLUMN IF NOT EXISTS arrival_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS awaiting_creator_decision boolean NOT NULL DEFAULT false;

-- 4) In-app notification kinds: drop the retired grace kind, add the new ones.
--    Historical 'grace_extended' rows (already-delivered toasts from the
--    retired mechanic) no longer correspond to a valid kind — remove them.
DELETE FROM public.user_notifications WHERE kind = 'grace_extended';
ALTER TABLE public.user_notifications DROP CONSTRAINT user_notifications_kind_check;
ALTER TABLE public.user_notifications ADD CONSTRAINT user_notifications_kind_check
  CHECK (kind IN ('minyan_confirmed_arriving', 'minyan_needs_decision', 'minyan_cancelled'));

-- 5) Cancel: organizer can always cancel a street minyan, no time window.
--    Scheduled minyanim keep the pre-existing 20-min protection for joiners.
CREATE OR REPLACE FUNCTION public.cancel_my_minyan(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row public.minyanim%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO _row FROM public.minyanim WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'minyan not found';
  END IF;

  IF _row.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'only the organizer can cancel this minyan';
  END IF;

  IF _row.type = 'scheduled' AND _row.scheduled_at IS NOT NULL
     AND _row.scheduled_at - now() < interval '20 minutes' THEN
    RAISE EXCEPTION 'too late to cancel — must be at least 20 minutes before start';
  END IF;

  DELETE FROM public.minyanim WHERE id = _id;
END;
$function$;

-- 6) Helper: call an edge function from SQL via pg_net, authenticated with
--    the service role key stored in Vault (never inline in migration text —
--    the secret was created separately via `vault.create_secret`).
CREATE OR REPLACE FUNCTION public._call_edge_function(_fn_name text, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
  _key text;
  _url text;
BEGIN
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  IF _key IS NULL THEN
    RETURN; -- secret not configured yet — no-op rather than error
  END IF;
  _url := 'https://jyqregdkmufrxyugrxrp.supabase.co/functions/v1/' || _fn_name;
  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || _key,
      'Content-Type', 'application/json'
    ),
    body := _payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public._call_edge_function(text, jsonb) FROM PUBLIC, anon, authenticated;

-- 7) Core state machine, run every minute.
CREATE OR REPLACE FUNCTION public.check_minyan_confirmation()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _m record;
  _yes integer;
  _no integer;
  _deadline timestamptz;
  _touched integer := 0;
BEGIN
  FOR _m IN
    SELECT * FROM public.minyanim
    WHERE type = 'street' AND expires_at > now()
  LOOP
    _deadline := COALESCE(_m.scheduled_at, _m.created_at);

    SELECT
      _m.extra_present + COALESCE(SUM((ready_now)::int), 0),
      COALESCE(SUM((NOT ready_now)::int), 0)
    INTO _yes, _no
    FROM public.minyan_participants
    WHERE minyan_id = _m.id;

    -- "Now" path always wins: first crossing, or upgrading a "wait"
    -- confirmation that hasn't started its countdown yet.
    IF _yes >= 10 AND (_m.confirmed_at IS NULL OR _m.arrival_deadline IS NULL) THEN
      UPDATE public.minyanim
        SET confirmed_at = COALESCE(confirmed_at, now()),
            confirmation_path = 'now',
            arrival_deadline = now() + interval '10 minutes',
            awaiting_creator_decision = false
        WHERE id = _m.id;

      PERFORM public._call_edge_function('notify-minyan-confirmed',
        jsonb_build_object('minyan_id', _m.id, 'kind', 'arriving'));
      _touched := _touched + 1;

    ELSIF _no >= 10 AND _m.confirmed_at IS NULL THEN
      UPDATE public.minyanim
        SET confirmed_at = now(),
            confirmation_path = 'wait'
        WHERE id = _m.id;
      _touched := _touched + 1;

    ELSIF _m.confirmed_at IS NOT NULL AND _m.arrival_deadline IS NULL AND now() >= _deadline THEN
      -- Wait-confirmed and the original deadline has now passed — start the 10-min clock.
      UPDATE public.minyanim
        SET arrival_deadline = now() + interval '10 minutes'
        WHERE id = _m.id;

      PERFORM public._call_edge_function('notify-minyan-confirmed',
        jsonb_build_object('minyan_id', _m.id, 'kind', 'arriving'));
      _touched := _touched + 1;

    ELSIF _m.confirmed_at IS NULL AND now() >= _deadline AND NOT _m.awaiting_creator_decision THEN
      -- Deadline passed, never reached 10 either way — ask the creator.
      UPDATE public.minyanim
        SET awaiting_creator_decision = true
        WHERE id = _m.id;

      PERFORM public._call_edge_function('notify-minyan-confirmed',
        jsonb_build_object('minyan_id', _m.id, 'kind', 'creator_decision'));
      _touched := _touched + 1;
    END IF;
  END LOOP;

  RETURN _touched;
END;
$$;

REVOKE ALL ON FUNCTION public.check_minyan_confirmation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_minyan_confirmation() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN PERFORM cron.unschedule('check-minyan-confirmation'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'check-minyan-confirmation',
  '* * * * *',
  $$SELECT public.check_minyan_confirmation();$$
);

-- 8) Creator decision RPC: confirm in person (start the 10-min clock) or cancel outright.
CREATE OR REPLACE FUNCTION public.creator_decide_minyan(_id uuid, _has_minyan boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.minyanim%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO _row FROM public.minyanim WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'minyan not found';
  END IF;
  IF _row.creator_id <> auth.uid() THEN
    RAISE EXCEPTION 'only the organizer can decide';
  END IF;
  IF NOT _row.awaiting_creator_decision THEN
    RAISE EXCEPTION 'no decision pending for this minyan';
  END IF;

  IF _has_minyan THEN
    UPDATE public.minyanim
      SET confirmed_at = now(),
          confirmation_path = 'now',
          arrival_deadline = now() + interval '10 minutes',
          awaiting_creator_decision = false
      WHERE id = _id;

    PERFORM public._call_edge_function('notify-minyan-confirmed',
      jsonb_build_object('minyan_id', _id, 'kind', 'arriving'));
  ELSE
    INSERT INTO public.user_notifications (user_id, minyan_id, kind, data)
    SELECT p.user_id, _id, 'minyan_cancelled',
           jsonb_build_object('prayer', _row.prayer, 'address', _row.address)
    FROM public.minyan_participants p
    WHERE p.minyan_id = _id;

    DELETE FROM public.minyanim WHERE id = _id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.creator_decide_minyan(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_decide_minyan(uuid, boolean) TO authenticated;
