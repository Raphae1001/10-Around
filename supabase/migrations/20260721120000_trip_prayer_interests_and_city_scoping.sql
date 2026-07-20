-- 1) Trip prayer interests: multi-select (shacharit/mincha/maariv) with a
--    preferred time + free-text note per prayer, attached to `stay` rows.
--    Shape: [{ "prayer": "shacharit"|"mincha"|"maariv", "time": "HH:MM"|null, "note": text|null }, ...]
ALTER TABLE public.minyanim
  ADD COLUMN IF NOT EXISTS trip_prayer_interests jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Clean city name for `scheduled` minyanim (distinct from the free-text
--    street `address`), captured from the Places autocomplete's locality
--    component at creation time. Used to city-scope the Planned tab.
ALTER TABLE public.minyanim
  ADD COLUMN IF NOT EXISTS city text;

-- 3) Planned-tab visibility: each viewer sees scheduled/stay minyanim in
--    their own city only, plus everything they created themselves
--    regardless of city/country. `_city_key` is computed client-side via
--    stayCityKey()/stay_city_key() from the viewer's last known position.
CREATE OR REPLACE FUNCTION public.planned_minyanim(_city_key text DEFAULT NULL)
RETURNS SETOF public.minyanim
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.minyanim
  WHERE type IN ('scheduled', 'stay')
    AND expires_at > now()
    AND (
      creator_id = auth.uid()
      OR (
        _city_key IS NOT NULL
        AND (
          (type = 'scheduled' AND city IS NOT NULL AND public.stay_city_key(city) = _city_key)
          OR (type = 'stay' AND public.stay_city_key(address) = _city_key)
        )
      )
    )
  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.planned_minyanim(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.planned_minyanim(text) TO authenticated;
