
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

-- Allow any authenticated user to discover the city group thread (needed when they haven't registered yet)
DROP POLICY IF EXISTS "Authenticated can read travel_city threads" ON public.chat_threads;
CREATE POLICY "Authenticated can read travel_city threads"
  ON public.chat_threads FOR SELECT
  TO authenticated
  USING (kind = 'travel_city');
