-- Fix stay_city_key: lower() must run BEFORE [^a-z0-9] replace (uppercase was turned into "-").
-- Aligns with src/lib/stay.ts stayCityKey().

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

-- Merge chat threads created with broken keys (-onaco, -erzliya) into existing ones.
DO $$
DECLARE
  _bad record;
  _good_id uuid;
BEGIN
  FOR _bad IN
    SELECT id, city_key, title
    FROM public.chat_threads
    WHERE kind = 'travel_city' AND city_key LIKE '-%'
  LOOP
    SELECT id INTO _good_id
    FROM public.chat_threads
    WHERE kind = 'travel_city'
      AND city_key = public.stay_city_key(_bad.title)
      AND id <> _bad.id
    LIMIT 1;

    IF _good_id IS NOT NULL THEN
      INSERT INTO public.chat_thread_members(thread_id, user_id)
      SELECT _good_id, m.user_id
      FROM public.chat_thread_members m
      WHERE m.thread_id = _bad.id
      ON CONFLICT DO NOTHING;

      DELETE FROM public.chat_threads WHERE id = _bad.id;
    ELSE
      UPDATE public.chat_threads
      SET city_key = public.stay_city_key(_bad.title)
      WHERE id = _bad.id;
    END IF;
  END LOOP;
END $$;
