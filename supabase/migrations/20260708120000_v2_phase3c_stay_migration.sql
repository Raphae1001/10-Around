-- MinyanNow v2 Phase 3c — Séjours Abroad via minyanim (type = stay)
-- Migre travel_presence → minyanim, met à jour RPCs + chat ville.
-- travel_presence est conservée (vide) — drop uniquement après validation explicite.

-- =============================================================================
-- 1. Helper city_key (aligné sur l'ancien travel_presence.city_key)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.stay_city_key(_label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    regexp_replace(lower(trim(COALESCE(_label, ''))), '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)', '', 'g'
  );
$$;

REVOKE ALL ON FUNCTION public.stay_city_key(text) FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 2. Chat ville sur INSERT minyanim stay (remplace on_travel_presence_chat)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.on_stay_minyan_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid;
  _city_key text;
BEGIN
  IF NEW.type <> 'stay' THEN
    RETURN NEW;
  END IF;

  _city_key := public.stay_city_key(NEW.address);
  IF _city_key = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _tid
  FROM public.chat_threads
  WHERE kind = 'travel_city' AND city_key = _city_key;

  IF _tid IS NULL THEN
    INSERT INTO public.chat_threads(kind, city_key, title)
    VALUES ('travel_city', _city_key, NEW.address)
    RETURNING id INTO _tid;
  END IF;

  INSERT INTO public.chat_thread_members(thread_id, user_id)
  VALUES (_tid, NEW.creator_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_travel_presence_chat ON public.travel_presence;
DROP TRIGGER IF EXISTS trg_stay_minyan_chat ON public.minyanim;
CREATE TRIGGER trg_stay_minyan_chat
  AFTER INSERT ON public.minyanim
  FOR EACH ROW
  WHEN (NEW.type = 'stay')
  EXECUTE FUNCTION public.on_stay_minyan_chat();

REVOKE ALL ON FUNCTION public.on_stay_minyan_chat() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.on_stay_minyan_chat() TO service_role;

-- =============================================================================
-- 3. Migration des 2 lignes travel_presence existantes → minyanim stay
-- =============================================================================
DO $$
DECLARE
  _row record;
  _mid uuid;
BEGIN
  ALTER TABLE public.minyanim DISABLE TRIGGER enforce_minyan_constraints_trg;

  FOR _row IN SELECT * FROM public.travel_presence ORDER BY created_at LOOP
    INSERT INTO public.minyanim (
      creator_id, type, prayer, nusach, message, address,
      latitude, longitude, is_live, scheduled_at,
      trip_start_date, trip_end_date, expires_at,
      present_count, extra_present
    ) VALUES (
      _row.user_id,
      'stay',
      'mincha',
      'Any',
      _row.note,
      _row.city_label,
      COALESCE(_row.latitude, 0),
      COALESCE(_row.longitude, 0),
      false,
      NULL,
      _row.date_start,
      _row.date_end,
      GREATEST((_row.date_end + interval '1 day')::timestamptz, now() + interval '1 hour'),
      0,
      0
    )
    RETURNING id INTO _mid;

    INSERT INTO public.minyan_participants (minyan_id, user_id)
    VALUES (_mid, _row.user_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  ALTER TABLE public.minyanim ENABLE TRIGGER enforce_minyan_constraints_trg;
END $$;

-- Backfill chat members for migrated stays (trigger already fired on INSERT)
INSERT INTO public.chat_thread_members(thread_id, user_id)
SELECT t.id, m.creator_id
FROM public.minyanim m
JOIN public.chat_threads t
  ON t.kind = 'travel_city'
 AND t.city_key = public.stay_city_key(m.address)
WHERE m.type = 'stay'
ON CONFLICT DO NOTHING;

DELETE FROM public.travel_presence;

-- =============================================================================
-- 4. RPCs — lecture séjours via minyanim stay
-- =============================================================================
CREATE OR REPLACE FUNCTION public.list_city_peers(_city_key text, _from date, _to date)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  date_start date,
  date_end date,
  note text,
  is_me boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.minyanim m
    WHERE m.type = 'stay'
      AND m.creator_id = _uid
      AND m.expires_at > now()
      AND public.stay_city_key(m.address) = _city_key
      AND m.trip_start_date <= _to
      AND m.trip_end_date >= _from
  ) THEN
    RAISE EXCEPTION 'not a traveler in this city for these dates';
  END IF;

  RETURN QUERY
    SELECT m.creator_id,
           COALESCE(p.display_name, 'Traveler') AS display_name,
           p.avatar_url,
           m.trip_start_date,
           m.trip_end_date,
           m.message AS note,
           (m.creator_id = _uid) AS is_me
    FROM public.minyanim m
    LEFT JOIN public.profiles p ON p.id = m.creator_id
    WHERE m.type = 'stay'
      AND m.expires_at > now()
      AND public.stay_city_key(m.address) = _city_key
      AND m.trip_start_date <= _to
      AND m.trip_end_date >= _from
    ORDER BY m.trip_start_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_travel_cities()
RETURNS TABLE(
  city_key text,
  city_label text,
  date_start date,
  date_end date,
  peer_count integer,
  thread_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH mine_grouped AS (
    SELECT public.stay_city_key(m.address) AS city_key,
           MAX(m.address) AS city_label,
           MIN(m.trip_start_date) AS date_start,
           MAX(m.trip_end_date) AS date_end
    FROM public.minyanim m
    WHERE m.type = 'stay'
      AND m.creator_id = auth.uid()
      AND m.expires_at > now()
    GROUP BY public.stay_city_key(m.address)
  )
  SELECT g.city_key,
         g.city_label,
         g.date_start,
         g.date_end,
         (
           SELECT COUNT(DISTINCT other.creator_id)::int
           FROM public.minyanim other
           WHERE other.type = 'stay'
             AND other.expires_at > now()
             AND public.stay_city_key(other.address) = g.city_key
             AND other.trip_start_date <= g.date_end
             AND other.trip_end_date >= g.date_start
         ) AS peer_count,
         (
           SELECT t.id FROM public.chat_threads t
           WHERE t.kind = 'travel_city' AND t.city_key = g.city_key
           LIMIT 1
         ) AS thread_id
  FROM mine_grouped g
  ORDER BY g.date_start;
$function$;

CREATE OR REPLACE FUNCTION public.count_travelers_in_city(_city_key text, _from date, _to date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COUNT(DISTINCT m.creator_id)::int
  FROM public.minyanim m
  WHERE m.type = 'stay'
    AND m.expires_at > now()
    AND public.stay_city_key(m.address) = _city_key
    AND m.trip_start_date <= _to
    AND m.trip_end_date >= _from;
$function$;

-- =============================================================================
-- 5. Chat join policy — séjour stay au lieu de travel_presence
-- =============================================================================
CREATE OR REPLACE FUNCTION public.can_join_chat_thread(_thread_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id = _thread_id
      AND (
        (t.kind = 'minyan' AND (
          EXISTS (SELECT 1 FROM public.minyanim m WHERE m.id = t.minyan_id AND m.creator_id = _user_id)
          OR EXISTS (SELECT 1 FROM public.minyan_participants p WHERE p.minyan_id = t.minyan_id AND p.user_id = _user_id)
        ))
        OR (t.kind = 'travel_city' AND EXISTS (
          SELECT 1 FROM public.minyanim m
          WHERE m.type = 'stay'
            AND m.creator_id = _user_id
            AND m.expires_at > now()
            AND public.stay_city_key(m.address) = t.city_key
        ))
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_join_chat_thread(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_join_chat_thread(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.list_city_peers(text, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_city_peers(text, date, date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.my_travel_cities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_travel_cities() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.count_travelers_in_city(text, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_travelers_in_city(text, date, date) TO authenticated;
