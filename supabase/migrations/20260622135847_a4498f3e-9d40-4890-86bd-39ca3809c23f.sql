
-- 1. Move push_token to its own owner-only table
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_push_tokens TO authenticated;
GRANT ALL ON public.user_push_tokens TO service_role;
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can read own push token" ON public.user_push_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own push token" ON public.user_push_tokens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own push token" ON public.user_push_tokens
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can delete own push token" ON public.user_push_tokens
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.user_push_tokens (user_id, token)
SELECT id, push_token FROM public.profiles WHERE push_token IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS push_token;

-- 2. minyan_confirmations: make INSERT explicitly server-only
REVOKE INSERT ON public.minyan_confirmations FROM authenticated, anon, PUBLIC;
GRANT INSERT ON public.minyan_confirmations TO service_role;
CREATE POLICY "No direct client inserts on confirmations"
  ON public.minyan_confirmations
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- 3. Lock down SECURITY DEFINER functions; keep answer_confirmation callable by users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_confirmations(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_due_confirmations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_confirmations(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_due_confirmations() TO service_role;

-- 4. Realtime: restrict realtime.messages so users only get topics they belong to.
-- Topics used by the app: "confirmations-<user_id>" and "minyanim-live" (postgres_changes only).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read own topics" ON realtime.messages;
CREATE POLICY "Authenticated can read own topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() = 'minyanim-live'
    OR realtime.topic() = ('confirmations-' || auth.uid()::text)
  );

DROP POLICY IF EXISTS "Authenticated can send own topics" ON realtime.messages;
CREATE POLICY "Authenticated can send own topics"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.topic() = 'minyanim-live'
    OR realtime.topic() = ('confirmations-' || auth.uid()::text)
  );
