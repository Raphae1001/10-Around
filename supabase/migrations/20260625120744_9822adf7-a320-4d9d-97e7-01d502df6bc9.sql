
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

DROP FUNCTION IF EXISTS public.get_my_profile();

CREATE OR REPLACE FUNCTION public.get_my_profile()
 RETURNS TABLE(id uuid, display_name text, first_name text, last_name text, avatar_url text, language text, trust_score integer, backup_mode boolean, backup_radius_m integer, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.first_name, p.last_name, p.avatar_url, p.language,
         p.trust_score, p.backup_mode, p.backup_radius_m, p.created_at, p.updated_at
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
