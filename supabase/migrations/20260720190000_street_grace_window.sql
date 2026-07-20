-- Street minyan grace window: at the planned start time, if <10 present, shift
-- the start once (10 min) and notify already-registered participants in-app.
-- If still <10 present once the shifted time arrives, cancel (reuse the existing
-- expiration cron) and notify participants. No push, no vote, no creation-flow change.

ALTER TABLE public.minyanim
  ADD COLUMN IF NOT EXISTS grace_extended boolean NOT NULL DEFAULT false;

-- Minimal in-app notification table — scoped to this feature, not a general inbox.
-- `data` snapshots display context (prayer/address) at insert time so the row
-- keeps meaning after the source minyan is purged by cleanup_expired_minyanim.
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minyan_id uuid REFERENCES public.minyanim(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('grace_extended', 'minyan_cancelled')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx
  ON public.user_notifications (user_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_notifications FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;

CREATE POLICY "Users can read their own notifications"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their own notifications read"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "No direct client inserts on user_notifications"
  ON public.user_notifications FOR INSERT TO authenticated
  WITH CHECK (false);

ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- Cron-friendly RPC, same pattern as trigger_due_confirmations / cleanup_expired_minyanim.
-- Street minyanim only; scheduled/stay untouched.
CREATE OR REPLACE FUNCTION public.check_minyan_grace()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _extended integer := 0;
  _cancelled integer := 0;
  _m record;
BEGIN
  -- Phase 1: first time reaching start with <10 present -> shift 10 min, once.
  FOR _m IN
    SELECT m.id, m.prayer, m.address
    FROM public.minyanim m
    WHERE m.type = 'street'
      AND m.expires_at > now()
      AND m.grace_extended = false
      AND m.present_count < 10
      AND COALESCE(m.scheduled_at, m.created_at) <= now()
  LOOP
    UPDATE public.minyanim
      SET scheduled_at = COALESCE(scheduled_at, created_at) + interval '10 minutes',
          grace_extended = true
      WHERE id = _m.id;

    INSERT INTO public.user_notifications (user_id, minyan_id, kind, data)
    SELECT p.user_id, _m.id, 'grace_extended',
           jsonb_build_object('prayer', _m.prayer, 'address', _m.address)
    FROM public.minyan_participants p
    WHERE p.minyan_id = _m.id;

    _extended := _extended + 1;
  END LOOP;

  -- Phase 2: grace already used, shifted start time reached, still <10 -> cancel.
  FOR _m IN
    SELECT m.id, m.prayer, m.address
    FROM public.minyanim m
    WHERE m.type = 'street'
      AND m.expires_at > now()
      AND m.grace_extended = true
      AND m.present_count < 10
      AND m.scheduled_at IS NOT NULL
      AND m.scheduled_at <= now()
  LOOP
    INSERT INTO public.user_notifications (user_id, minyan_id, kind, data)
    SELECT p.user_id, _m.id, 'minyan_cancelled',
           jsonb_build_object('prayer', _m.prayer, 'address', _m.address)
    FROM public.minyan_participants p
    WHERE p.minyan_id = _m.id;

    -- Hand off to the existing expiration cron — no parallel delete mechanism.
    UPDATE public.minyanim SET expires_at = now() WHERE id = _m.id;

    _cancelled := _cancelled + 1;
  END LOOP;

  RETURN _extended + _cancelled;
END;
$$;

REVOKE ALL ON FUNCTION public.check_minyan_grace() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_minyan_grace() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN
  PERFORM cron.unschedule('check-minyan-grace');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'check-minyan-grace',
  '* * * * *',
  $$SELECT public.check_minyan_grace();$$
);
