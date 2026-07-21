-- Surface each traveler's chosen prayer interests (prayer + time + note) on
-- the travel-city page — both for the creator right after publishing their
-- trip, and for every other traveler viewing the same city/dates.

DROP FUNCTION IF EXISTS public.list_city_peers(text, date, date);

CREATE FUNCTION public.list_city_peers(_city_key text, _from date, _to date)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  date_start date,
  date_end date,
  note text,
  trip_prayer_interests jsonb,
  is_me boolean
)
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
           m.trip_prayer_interests,
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
$function$;

REVOKE ALL ON FUNCTION public.list_city_peers(text, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_city_peers(text, date, date) TO authenticated;
