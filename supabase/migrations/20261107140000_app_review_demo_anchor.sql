-- TEMPORARY, for App Store review (see 20261107130000_app_review_demo.sql).
-- The sample minyanim are shown next to the caller's position. The home map already gets
-- them relocated by nearby_minyanim(); this remembers each caller's last position so the
-- minyan detail / share / success pages (get_minyan_by_id) show the same relocated place
-- (so "Directions" does not send the reviewer to Cupertino).
-- Undo with supabase/app-review-demo-revert.sql.

CREATE TABLE IF NOT EXISTS public.app_review_demo_anchor (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  anchor_lat double precision NOT NULL,
  anchor_lng double precision NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only the SECURITY DEFINER functions below touch it: no policy, no grant.
ALTER TABLE public.app_review_demo_anchor ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_review_demo_anchor FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._app_review_demo_relocate(m public.minyanim, la double precision, ln double precision)
RETURNS public.minyanim
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'extensions'
AS $$
  SELECT jsonb_populate_record(NULL::public.minyanim, to_jsonb(m) || jsonb_build_object(
    'latitude',  la + CASE WHEN m.message LIKE '%Sample minyan A' THEN 0.0020 ELSE -0.0015 END,
    'longitude', ln + CASE WHEN m.message LIKE '%Sample minyan A' THEN 0.0010 ELSE 0.0025 END,
    'location',  extensions.ST_SetSRID(extensions.ST_MakePoint(
                   ln + CASE WHEN m.message LIKE '%Sample minyan A' THEN 0.0010 ELSE 0.0025 END,
                   la + CASE WHEN m.message LIKE '%Sample minyan A' THEN 0.0020 ELSE -0.0015 END), 4326)::extensions.geography::text));
$$;

REVOKE ALL ON FUNCTION public._app_review_demo_relocate(public.minyanim, double precision, double precision)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.nearby_minyanim(lat double precision, lng double precision, radius_m integer DEFAULT 1000)
RETURNS SETOF minyanim
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND lat IS NOT NULL AND lng IS NOT NULL THEN
    INSERT INTO public.app_review_demo_anchor (user_id, anchor_lat, anchor_lng)
    VALUES (auth.uid(), lat, lng)
    ON CONFLICT (user_id) DO UPDATE
      SET anchor_lat = EXCLUDED.anchor_lat, anchor_lng = EXCLUDED.anchor_lng, updated_at = now();
  END IF;

  RETURN QUERY
  SELECT u.* FROM (
    SELECT m.* FROM public.minyanim m
    WHERE m.expires_at > now()
      AND m.message NOT LIKE '[App Review demo]%'
      AND (
        (m.type = 'street'
          AND extensions.ST_DWithin(m.location, extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography, radius_m))
        OR (m.type = 'scheduled' AND m.scheduled_at IS NOT NULL
          AND extensions.ST_DWithin(m.location, extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography, radius_m))
      )
    UNION ALL
    SELECT (public._app_review_demo_relocate(d, lat, lng)).*
    FROM public.minyanim d
    WHERE d.expires_at > now() AND d.message LIKE '[App Review demo]%'
  ) u
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_minyan_by_id(_id uuid)
RETURNS SETOF minyanim
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT (s.r).*
  FROM (
    SELECT CASE
             WHEN m.message LIKE '[App Review demo]%' AND a.user_id IS NOT NULL
               THEN public._app_review_demo_relocate(m, a.anchor_lat, a.anchor_lng)
             ELSE m
           END AS r
    FROM public.minyanim m
    LEFT JOIN public.app_review_demo_anchor a ON a.user_id = auth.uid()
    WHERE m.id = _id
  ) s;
$$;
