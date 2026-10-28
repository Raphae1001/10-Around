-- Blocking: a user can block another user. The app hides blocked users'
-- messages and minyanim for the blocker. A row is only visible to its blocker.
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own blocks"
  ON public.user_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users create own blocks"
  ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users remove own blocks"
  ON public.user_blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

REVOKE ALL ON public.user_blocks FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
