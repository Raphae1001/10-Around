-- Public (anon-safe) summary for the WhatsApp-shared /minyan/:id link. Only
-- coarse/non-sensitive fields — never exact address, lat/lng, creator_id, or
-- message — so a logged-out visitor's link preview and landing page can show
-- real content ("7/10 · Mincha · Paris 19e") without leaking anything the
-- world-read RLS fix (20260726121500) just closed off.
CREATE OR REPLACE FUNCTION public.public_minyan_summary(_id uuid)
RETURNS TABLE(
  id uuid,
  type public.minyan_type,
  prayer public.minyan_prayer,
  city text,
  present_count integer,
  scheduled_at timestamptz,
  confirmed_at timestamptz,
  is_live boolean,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, type, prayer, city, present_count, scheduled_at, confirmed_at, is_live, expires_at
  FROM public.minyanim
  WHERE id = _id AND expires_at > now();
$$;

-- Explicit grant to anon AND authenticated (not relying on default
-- privileges) — this one is intentionally public.
REVOKE ALL ON FUNCTION public.public_minyan_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_minyan_summary(uuid) TO anon, authenticated;
