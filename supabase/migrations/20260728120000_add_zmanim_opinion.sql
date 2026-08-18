-- User's preferred zmanim calculation opinion, used by the Profile Zmanim
-- screen and to auto-pick the prayer type in the ad-hoc "Now" create flow.
-- "sepharade" and "ashkenaze" share the same GRA-based astronomical
-- calculation client-side (src/lib/zmanim.ts) — no codified open-source
-- "Rav Ovadia Yosef" method exists, so both use the standard baseline and
-- differ only in the UI label. "habad" is a real, distinct calculation
-- (Baal HaTanya).
ALTER TABLE public.profiles
  ADD COLUMN zmanim_opinion text NOT NULL DEFAULT 'ashkenaze'
  CHECK (zmanim_opinion IN ('ashkenaze', 'sepharade', 'habad'));

-- get_my_profile() needs recreating (not CREATE OR REPLACE-able) whenever its
-- return row shape changes.
DROP FUNCTION public.get_my_profile();

CREATE FUNCTION public.get_my_profile()
 RETURNS TABLE(id uuid, display_name text, first_name text, last_name text, avatar_url text, language text, trust_score integer, backup_mode boolean, backup_radius_m integer, zmanim_opinion text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.first_name, p.last_name, p.avatar_url, p.language,
         p.trust_score, p.backup_mode, p.backup_radius_m, p.zmanim_opinion, p.created_at, p.updated_at
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
$function$;

-- DROP FUNCTION resets grants to Supabase's defaults (which include anon) —
-- explicitly lock this back down to authenticated only.
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
