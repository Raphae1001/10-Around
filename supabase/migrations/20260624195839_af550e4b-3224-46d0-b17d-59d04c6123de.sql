INSERT INTO public.chat_thread_members(thread_id, user_id)
SELECT t.id, tp.user_id
FROM public.travel_presence tp
JOIN public.chat_threads t
  ON t.kind = 'travel_city'
 AND t.city_key = tp.city_key
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.on_travel_presence_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _tid uuid;
BEGIN
  SELECT id INTO _tid
  FROM public.chat_threads
  WHERE kind = 'travel_city'
    AND city_key = NEW.city_key;

  IF _tid IS NULL THEN
    INSERT INTO public.chat_threads(kind, city_key, title)
    VALUES ('travel_city', NEW.city_key, NEW.city_label)
    RETURNING id INTO _tid;
  END IF;

  INSERT INTO public.chat_thread_members(thread_id, user_id)
  SELECT _tid, tp.user_id
  FROM public.travel_presence tp
  WHERE tp.city_key = NEW.city_key
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;