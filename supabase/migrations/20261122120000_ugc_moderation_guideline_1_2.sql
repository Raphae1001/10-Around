-- App Store Guideline 1.2 (user-generated content) precautions:
--   1) filter objectionable content   2) flag content   3) block users + notify developer
-- NOT applied automatically: review, then run once on the production project.

-- ---------------------------------------------------------------------------
-- 1) Objectionable-content filter (server-side, so it cannot be bypassed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderation_terms (
  term text PRIMARY KEY CHECK (term = lower(term) AND char_length(term) BETWEEN 2 AND 64)
);
ALTER TABLE public.moderation_terms ENABLE ROW LEVEL SECURITY;  -- no policies: service_role only
GRANT ALL ON public.moderation_terms TO service_role;

-- Starter list (slurs, sexual, threats) in EN / FR / HE. Extend freely: INSERT INTO moderation_terms.
INSERT INTO public.moderation_terms (term) VALUES
  ('fuck'),('shit'),('bitch'),('asshole'),('cunt'),('pussy'),('whore'),('slut'),('porn'),
  ('nigger'),('nigga'),('faggot'),('retard'),('kike'),('chink'),('spic'),('nazi'),('heil hitler'),
  ('kill you'),('kill yourself'),('rape'),('terrorist'),('sieg heil'),
  ('putain'),('merde'),('connard'),('connasse'),('salope'),('encule'),('enculé'),('pute'),('nique'),
  ('negre'),('nègre'),('bougnoule'),('youpin'),('sale juif'),('sale arabe'),
  ('זונה'),('בן זונה'),('חרא'),('מניאק'),('מנוול'),('הומו מסריח'),('אנס')
ON CONFLICT DO NOTHING;

-- SECURITY DEFINER: app users cannot read moderation_terms (RLS), the filter still must.
CREATE OR REPLACE FUNCTION public.is_objectionable(_text text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _text IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.moderation_terms t
    WHERE (' ' || regexp_replace(lower(_text), '[^[:alnum:]]+', ' ', 'g') || ' ')
          LIKE '% ' || regexp_replace(t.term, '[^[:alnum:]]+', ' ', 'g') || ' %'
  );
$$;

CREATE OR REPLACE FUNCTION public.reject_objectionable_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _col text;
  _val text;
BEGIN
  FOREACH _col IN ARRAY TG_ARGV LOOP
    _val := to_jsonb(NEW) ->> _col;
    IF public.is_objectionable(_val) THEN
      RAISE EXCEPTION 'objectionable_content' USING ERRCODE = 'P0001',
        HINT = 'This content is not allowed by the Terms of Service.';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_filter_chat_messages ON public.chat_messages;
CREATE TRIGGER trg_filter_chat_messages BEFORE INSERT OR UPDATE OF content ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.reject_objectionable_content('content');

DROP TRIGGER IF EXISTS trg_filter_minyanim ON public.minyanim;
CREATE TRIGGER trg_filter_minyanim BEFORE INSERT OR UPDATE OF message, address ON public.minyanim
  FOR EACH ROW EXECUTE FUNCTION public.reject_objectionable_content('message', 'address');

DROP TRIGGER IF EXISTS trg_filter_profiles ON public.profiles;
CREATE TRIGGER trg_filter_profiles BEFORE INSERT OR UPDATE OF first_name, last_name, display_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.reject_objectionable_content('first_name', 'last_name', 'display_name');

-- ---------------------------------------------------------------------------
-- 2) Reports: can target a message, a minyan or a user; tracked until handled
-- ---------------------------------------------------------------------------
ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'message'
    CHECK (target_type IN ('message', 'minyan', 'user')),
  ADD COLUMN IF NOT EXISTS minyan_id uuid REFERENCES public.minyanim(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'actioned', 'dismissed')),
  ADD COLUMN IF NOT EXISTS handled_at timestamptz;

CREATE INDEX IF NOT EXISTS content_reports_open_idx
  ON public.content_reports (created_at DESC) WHERE status = 'open';

-- ---------------------------------------------------------------------------
-- 3) Blocking also alerts the developer (Apple requirement) via a report row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_on_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.content_reports (reporter_id, reported_user_id, target_type, reason, details)
  VALUES (NEW.blocker_id, NEW.blocked_id, 'user', 'blocked_user', 'User blocked another user');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_on_block ON public.user_blocks;
CREATE TRIGGER trg_report_on_block AFTER INSERT ON public.user_blocks
  FOR EACH ROW EXECUTE FUNCTION public.report_on_block();

-- ---------------------------------------------------------------------------
-- 4) Every new report triggers the notify-report edge function (email to the developer)
--    Uses the same _call_edge_function helper / vault secret as the push functions; no-op if unset.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_developer_of_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._call_edge_function('notify-report', jsonb_build_object('report_id', NEW.id));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- never block a user's report/block because alerting failed
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_developer_of_report ON public.content_reports;
CREATE TRIGGER trg_notify_developer_of_report AFTER INSERT ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_developer_of_report();

-- Blocked users' minyanim disappear instantly for the blocker (feed filter is client-side too).

REVOKE EXECUTE ON FUNCTION public.notify_developer_of_report(), public.report_on_block(), public.reject_objectionable_content() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_objectionable(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_objectionable(text) TO authenticated, service_role;
