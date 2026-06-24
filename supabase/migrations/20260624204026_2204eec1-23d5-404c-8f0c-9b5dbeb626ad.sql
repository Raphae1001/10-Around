DROP FUNCTION IF EXISTS public.get_my_profile();

CREATE FUNCTION public.get_my_profile()
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  language text,
  trust_score integer,
  backup_mode boolean,
  backup_radius_m integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    p.language,
    p.trust_score,
    p.backup_mode,
    p.backup_radius_m,
    p.created_at,
    p.updated_at
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;