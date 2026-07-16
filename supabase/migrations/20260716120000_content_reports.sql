-- Content reports (UGC moderation — App Store Guideline 1.2)
-- Reporters can insert their own rows; only service_role reads all for review.

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  thread_id uuid REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL DEFAULT 'inappropriate'
    CHECK (char_length(reason) >= 1 AND char_length(reason) <= 64),
  details text CHECK (details IS NULL OR char_length(details) <= 1000),
  message_snapshot text CHECK (message_snapshot IS NULL OR char_length(message_snapshot) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_reports_created_idx
  ON public.content_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS content_reports_reporter_idx
  ON public.content_reports (reporter_id, created_at DESC);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;

CREATE POLICY "Users can insert their own reports"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can read their own reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());
