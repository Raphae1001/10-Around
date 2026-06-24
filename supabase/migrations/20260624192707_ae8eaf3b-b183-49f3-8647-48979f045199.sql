
-- ============== Chat threads ==============
CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('minyan','travel_city')),
  minyan_id uuid REFERENCES public.minyanim(id) ON DELETE CASCADE,
  city_key text,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX chat_threads_minyan_uniq ON public.chat_threads(minyan_id) WHERE kind = 'minyan';
CREATE UNIQUE INDEX chat_threads_city_uniq ON public.chat_threads(city_key) WHERE kind = 'travel_city';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

-- ============== Members ==============
CREATE TABLE public.chat_thread_members (
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_thread_members TO authenticated;
GRANT ALL ON public.chat_thread_members TO service_role;

ALTER TABLE public.chat_thread_members ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a member of a thread?
CREATE OR REPLACE FUNCTION public.is_chat_member(_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_thread_members
    WHERE thread_id = _thread_id AND user_id = auth.uid()
  );
$$;

-- ============== Messages ==============
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_thread_idx ON public.chat_messages(thread_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============== Policies ==============
CREATE POLICY "Members can read their threads"
  ON public.chat_threads FOR SELECT TO authenticated
  USING (public.is_chat_member(id));

CREATE POLICY "Members can read membership of their threads"
  ON public.chat_thread_members FOR SELECT TO authenticated
  USING (public.is_chat_member(thread_id));

CREATE POLICY "Users can read their own membership row"
  ON public.chat_thread_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members can read messages in their threads"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_chat_member(thread_id));

CREATE POLICY "Members can post in their threads as themselves"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_chat_member(thread_id));

CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============== Auto-join trigger: minyan participants ==============
CREATE OR REPLACE FUNCTION public.ensure_minyan_chat(_minyan_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _tid uuid; _addr text;
BEGIN
  SELECT id INTO _tid FROM public.chat_threads WHERE kind='minyan' AND minyan_id=_minyan_id;
  IF _tid IS NULL THEN
    SELECT address INTO _addr FROM public.minyanim WHERE id=_minyan_id;
    INSERT INTO public.chat_threads(kind, minyan_id, title)
      VALUES ('minyan', _minyan_id, COALESCE(_addr, 'Minyan chat'))
      RETURNING id INTO _tid;
  END IF;
  RETURN _tid;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_participant_join_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _tid uuid;
BEGIN
  _tid := public.ensure_minyan_chat(NEW.minyan_id);
  INSERT INTO public.chat_thread_members(thread_id, user_id)
    VALUES (_tid, NEW.user_id)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_participant_join_chat
  AFTER INSERT ON public.minyan_participants
  FOR EACH ROW EXECUTE FUNCTION public.on_participant_join_chat();

-- ============== Auto-join trigger: travel minyanim (city group) ==============
CREATE OR REPLACE FUNCTION public.normalize_city(_addr text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT lower(trim(split_part(COALESCE(_addr,''), ',', 1)));
$$;

CREATE OR REPLACE FUNCTION public.on_travel_minyan_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _key text; _tid uuid; _title text;
BEGIN
  IF NEW.type <> 'travel' THEN RETURN NEW; END IF;
  _key := public.normalize_city(NEW.address);
  IF _key IS NULL OR _key = '' THEN RETURN NEW; END IF;
  _title := split_part(NEW.address, ',', 1);

  SELECT id INTO _tid FROM public.chat_threads WHERE kind='travel_city' AND city_key=_key;
  IF _tid IS NULL THEN
    INSERT INTO public.chat_threads(kind, city_key, title)
      VALUES ('travel_city', _key, _title)
      RETURNING id INTO _tid;
  END IF;

  INSERT INTO public.chat_thread_members(thread_id, user_id)
    VALUES (_tid, NEW.creator_id)
    ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_travel_minyan_chat
  AFTER INSERT ON public.minyanim
  FOR EACH ROW EXECUTE FUNCTION public.on_travel_minyan_chat();

-- ============== Realtime ==============
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_thread_members;

-- ============== Helper: list my threads with last message ==============
CREATE OR REPLACE FUNCTION public.my_chat_threads()
RETURNS TABLE (
  id uuid,
  kind text,
  title text,
  minyan_id uuid,
  city_key text,
  member_count bigint,
  last_message text,
  last_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.kind, t.title, t.minyan_id, t.city_key,
    (SELECT count(*) FROM public.chat_thread_members m WHERE m.thread_id = t.id) AS member_count,
    (SELECT content FROM public.chat_messages msg WHERE msg.thread_id = t.id ORDER BY created_at DESC LIMIT 1) AS last_message,
    COALESCE(
      (SELECT created_at FROM public.chat_messages msg WHERE msg.thread_id = t.id ORDER BY created_at DESC LIMIT 1),
      t.created_at
    ) AS last_at
  FROM public.chat_threads t
  WHERE EXISTS (
    SELECT 1 FROM public.chat_thread_members m
    WHERE m.thread_id = t.id AND m.user_id = auth.uid()
  )
  ORDER BY last_at DESC;
$$;
