-- Trust score
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 100;

-- Confirmation role enum
DO $$ BEGIN
  CREATE TYPE public.confirmation_role AS ENUM ('organizer','participant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.confirmation_answer AS ENUM ('yes','no');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.minyan_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minyan_id uuid NOT NULL REFERENCES public.minyanim(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.confirmation_role NOT NULL,
  answer public.confirmation_answer,
  asked_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  UNIQUE (minyan_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.minyan_confirmations TO authenticated;
GRANT ALL ON public.minyan_confirmations TO service_role;
ALTER TABLE public.minyan_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own confirmations"
  ON public.minyan_confirmations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.minyanim m WHERE m.id = minyan_id AND m.creator_id = auth.uid()
  ));

CREATE POLICY "Users can update their own confirmations"
  ON public.minyan_confirmations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RPC: request confirmations for a minyan (organizer + participants)
CREATE OR REPLACE FUNCTION public.request_confirmations(_minyan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _creator uuid;
BEGIN
  SELECT creator_id INTO _creator FROM public.minyanim WHERE id = _minyan_id;
  IF _creator IS NULL THEN RETURN; END IF;

  INSERT INTO public.minyan_confirmations (minyan_id, user_id, role)
  VALUES (_minyan_id, _creator, 'organizer')
  ON CONFLICT (minyan_id, user_id) DO NOTHING;

  INSERT INTO public.minyan_confirmations (minyan_id, user_id, role)
  SELECT _minyan_id, p.user_id, 'participant'
  FROM public.minyan_participants p
  WHERE p.minyan_id = _minyan_id AND p.user_id <> _creator
  ON CONFLICT (minyan_id, user_id) DO NOTHING;
END; $$;

-- RPC: answer a confirmation; adjust trust for participants
CREATE OR REPLACE FUNCTION public.answer_confirmation(_minyan_id uuid, _answer public.confirmation_answer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _role public.confirmation_role; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  UPDATE public.minyan_confirmations
    SET answer = _answer, answered_at = now()
    WHERE minyan_id = _minyan_id AND user_id = _uid
    RETURNING role INTO _role;

  IF _role = 'participant' THEN
    IF _answer = 'yes' THEN
      UPDATE public.profiles SET trust_score = LEAST(trust_score + 2, 999) WHERE id = _uid;
    ELSE
      UPDATE public.profiles SET trust_score = GREATEST(trust_score - 5, 0) WHERE id = _uid;
    END IF;
  END IF;
END; $$;

-- Cron-friendly RPC: trigger confirmations for any minyan whose start time has passed
CREATE OR REPLACE FUNCTION public.trigger_due_confirmations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer := 0; _m record;
BEGIN
  FOR _m IN
    SELECT m.id FROM public.minyanim m
    WHERE m.expires_at > now()
      AND COALESCE(m.scheduled_at, m.created_at) <= now()
      AND NOT EXISTS (SELECT 1 FROM public.minyan_confirmations c WHERE c.minyan_id = m.id)
  LOOP
    PERFORM public.request_confirmations(_m.id);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END; $$;

-- Enable realtime for confirmations
ALTER TABLE public.minyan_confirmations REPLICA IDENTITY FULL;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.minyan_confirmations';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- pg_cron job: run every minute
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN
  PERFORM cron.unschedule('trigger-due-confirmations');
EXCEPTION WHEN others THEN NULL; END $$;
SELECT cron.schedule(
  'trigger-due-confirmations',
  '* * * * *',
  $$SELECT public.trigger_due_confirmations();$$
);