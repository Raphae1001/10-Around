-- Both live insertion paths into user_notifications — the
-- notify-minyan-confirmed edge function (cron-triggered, no overlap guard)
-- and creator_decide_minyan()'s "no" branch (check-then-insert-then-delete,
-- no lock) — can insert the same (user_id, minyan_id, kind) row twice under
-- genuine concurrency: an overlapping cron tick, or a double-tap on the
-- creator's "No" button. A third historical insert site (check_minyan_grace,
-- 20260720190000) no longer exists in the live schema, confirmed via
-- pg_proc — nothing to update there.
--
-- minyan_id is nullable (ON DELETE SET NULL once cleanup_expired_minyanim
-- purges the source minyan), but every live insert always supplies a real,
-- non-null minyan_id at insert time — the eventual SET NULL happens well
-- after any duplicate-prevention need was already served, so it doesn't
-- weaken this constraint. All three `kind` values in the existing CHECK
-- constraint are covered by this rule, verified against live data.
ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_user_minyan_kind_key
  UNIQUE (user_id, minyan_id, kind);

-- Same insert as before, now silently skipping a duplicate instead of
-- erroring the second concurrent caller out.
CREATE OR REPLACE FUNCTION public.creator_decide_minyan(_id uuid, _has_minyan boolean)
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
    WHERE p.minyan_id = _id
    ON CONFLICT (user_id, minyan_id, kind) DO NOTHING;

    DELETE FROM public.minyanim WHERE id = _id;
  END IF;
END;
$function$;
