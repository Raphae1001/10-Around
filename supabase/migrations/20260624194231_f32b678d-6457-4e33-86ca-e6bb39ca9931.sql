
-- 1. Clean up old travel-type minyanim (they should now live in travel_presence)
DELETE FROM public.minyanim WHERE type = 'travel';

-- 2. nearby_minyanim no longer includes travel registrations
CREATE OR REPLACE FUNCTION public.nearby_minyanim(lat double precision, lng double precision, radius_m integer DEFAULT 1000)
 RETURNS SETOF public.minyanim
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT *
  FROM public.minyanim
  WHERE expires_at > now()
    AND (
      (type IN ('street', 'airport') AND extensions.ST_DWithin(location, extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography, radius_m))
      OR (type = 'hotel')
    )
  ORDER BY created_at DESC;
$function$;

-- 3. List travel peers (only callers who are themselves registered in the same city with overlapping dates can see)
CREATE OR REPLACE FUNCTION public.list_city_peers(_city_key text, _from date, _to date)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, date_start date, date_end date, note text, is_me boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.travel_presence
    WHERE user_id = _uid AND city_key = _city_key
      AND date_start <= _to AND date_end >= _from
  ) THEN
    RAISE EXCEPTION 'not a traveler in this city for these dates';
  END IF;
  RETURN QUERY
    SELECT tp.user_id,
           COALESCE(p.display_name, 'Traveler') AS display_name,
           p.avatar_url,
           tp.date_start, tp.date_end, tp.note,
           (tp.user_id = _uid) AS is_me
    FROM public.travel_presence tp
    LEFT JOIN public.profiles p ON p.id = tp.user_id
    WHERE tp.city_key = _city_key
      AND tp.date_start <= _to AND tp.date_end >= _from
    ORDER BY tp.date_start;
END;
$function$;

-- 4. My travel cities (group by city_key, show count of overlapping travelers and the user's date range)
CREATE OR REPLACE FUNCTION public.my_travel_cities()
 RETURNS TABLE(city_key text, city_label text, date_start date, date_end date, peer_count integer, thread_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT mine.city_key,
         MAX(mine.city_label) AS city_label,
         MIN(mine.date_start) AS date_start,
         MAX(mine.date_end) AS date_end,
         (
           SELECT COUNT(DISTINCT other.user_id)::int
           FROM public.travel_presence other
           WHERE other.city_key = mine.city_key
             AND other.date_start <= MAX(mine.date_end)
             AND other.date_end >= MIN(mine.date_start)
         ) AS peer_count,
         (SELECT t.id FROM public.chat_threads t WHERE t.kind='travel_city' AND t.city_key = mine.city_key LIMIT 1) AS thread_id
  FROM public.travel_presence mine
  WHERE mine.user_id = auth.uid()
  GROUP BY mine.city_key
  ORDER BY MIN(mine.date_start);
$function$;
