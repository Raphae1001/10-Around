
-- 1. Column-level grants on profiles: hide trust_score / backup_* from other users
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, display_name, avatar_url, language, created_at, updated_at)
  ON public.profiles TO authenticated;

-- Helper so each user can fetch their OWN full profile (incl. trust_score, backup_*)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 2. Stop broadcasting participant join/leave events to every authenticated user.
-- minyanim.present_count is kept in sync by trigger and still streams via the
-- minyanim publication, so live counts continue to work.
ALTER PUBLICATION supabase_realtime DROP TABLE public.minyan_participants;
