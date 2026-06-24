
-- =========== travel_presence ===========
CREATE TABLE public.travel_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city_key text NOT NULL,
  city_label text NOT NULL,
  address text,
  latitude double precision,
  longitude double precision,
  date_start date NOT NULL,
  date_end date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (date_end >= date_start)
);

CREATE INDEX travel_presence_city_idx ON public.travel_presence(city_key, date_start, date_end);
CREATE INDEX travel_presence_user_idx ON public.travel_presence(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_presence TO authenticated;
GRANT ALL ON public.travel_presence TO service_role;

ALTER TABLE public.travel_presence ENABLE ROW LEVEL SECURITY;

-- Anyone can see their own row
CREATE POLICY "Read own travel presence"
  ON public.travel_presence FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- You can see other travelers' presence ONLY in a city where you also
-- have a presence with overlapping dates.
CREATE POLICY "Read peers in same city overlapping"
  ON public.travel_presence FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_presence mine
      WHERE mine.user_id = auth.uid()
        AND mine.city_key = travel_presence.city_key
        AND mine.date_start <= travel_presence.date_end
        AND mine.date_end >= travel_presence.date_start
    )
  );

CREATE POLICY "Insert own travel presence"
  ON public.travel_presence FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own travel presence"
  ON public.travel_presence FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own travel presence"
  ON public.travel_presence FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_travel_presence_touch
  BEFORE UPDATE ON public.travel_presence
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========== Auto-add to city chat ===========
CREATE OR REPLACE FUNCTION public.on_travel_presence_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tid uuid;
BEGIN
  SELECT id INTO _tid FROM public.chat_threads
    WHERE kind='travel_city' AND city_key = NEW.city_key;
  IF _tid IS NULL THEN
    INSERT INTO public.chat_threads(kind, city_key, title)
      VALUES ('travel_city', NEW.city_key, NEW.city_label)
      RETURNING id INTO _tid;
  END IF;
  INSERT INTO public.chat_thread_members(thread_id, user_id)
    VALUES (_tid, NEW.user_id)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_travel_presence_chat
  AFTER INSERT ON public.travel_presence
  FOR EACH ROW EXECUTE FUNCTION public.on_travel_presence_chat();

-- =========== Count peers in same city / overlapping dates ===========
CREATE OR REPLACE FUNCTION public.count_travelers_in_city(
  _city_key text, _from date, _to date
) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(DISTINCT user_id)::int
  FROM public.travel_presence
  WHERE city_key = _city_key
    AND date_start <= _to
    AND date_end >= _from;
$$;

-- =========== get_or_create chat for a minyan I belong to ===========
CREATE OR REPLACE FUNCTION public.get_or_create_minyan_chat(_minyan_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tid uuid; _addr text; _uid uuid := auth.uid(); _allowed boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.minyanim m
    WHERE m.id = _minyan_id AND (
      m.creator_id = _uid OR EXISTS(
        SELECT 1 FROM public.minyan_participants p
        WHERE p.minyan_id = _minyan_id AND p.user_id = _uid
      )
    )
  ) INTO _allowed;
  IF NOT _allowed THEN RAISE EXCEPTION 'not a member of this minyan'; END IF;

  SELECT id INTO _tid FROM public.chat_threads
    WHERE kind='minyan' AND minyan_id=_minyan_id;
  IF _tid IS NULL THEN
    SELECT address INTO _addr FROM public.minyanim WHERE id=_minyan_id;
    INSERT INTO public.chat_threads(kind, minyan_id, title)
      VALUES ('minyan', _minyan_id, COALESCE(_addr,'Minyan chat'))
      RETURNING id INTO _tid;
  END IF;

  INSERT INTO public.chat_thread_members(thread_id, user_id)
    SELECT _tid, p.user_id FROM public.minyan_participants p
    WHERE p.minyan_id = _minyan_id
    ON CONFLICT DO NOTHING;
  INSERT INTO public.chat_thread_members(thread_id, user_id)
    SELECT _tid, m.creator_id FROM public.minyanim m
    WHERE m.id = _minyan_id
    ON CONFLICT DO NOTHING;

  RETURN _tid;
END;
$$;

-- =========== Backfill chats for existing data ===========
DO $$
DECLARE _m record; _tid uuid;
BEGIN
  FOR _m IN SELECT id, address FROM public.minyanim WHERE type IN ('street','airport','hotel') LOOP
    SELECT id INTO _tid FROM public.chat_threads WHERE kind='minyan' AND minyan_id=_m.id;
    IF _tid IS NULL THEN
      INSERT INTO public.chat_threads(kind, minyan_id, title)
        VALUES ('minyan', _m.id, COALESCE(_m.address,'Minyan chat'))
        RETURNING id INTO _tid;
    END IF;
    INSERT INTO public.chat_thread_members(thread_id, user_id)
      SELECT _tid, creator_id FROM public.minyanim WHERE id=_m.id
      ON CONFLICT DO NOTHING;
    INSERT INTO public.chat_thread_members(thread_id, user_id)
      SELECT _tid, p.user_id FROM public.minyan_participants p WHERE p.minyan_id=_m.id
      ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.travel_presence;
