-- `minyanim`, `minyan_participants` and `profiles` all had a blanket
-- `USING (true)` SELECT policy for `authenticated`. Since Supabase's guest
-- sign-in makes an authenticated account free, any visitor could run
-- `GET /rest/v1/minyanim?select=*` (or the other two tables) directly against
-- PostgREST — bypassing every radius/id filter the app's own UI applies — and
-- pull exact coordinates + who attended + the full user directory. Chained
-- together that's a full de-anonymisation of every user's location history.
--
-- Fix: direct REST access is now scoped to rows the caller actually owns or
-- shares a chat thread with. The one legitimate cross-user read each table
-- needs (viewing a specific minyan by id, checking whether *I* joined it,
-- looking up chat members' display names) is preserved via either an
-- id-scoped SECURITY DEFINER RPC (unguessable UUID, not bulk-enumerable) or
-- an EXISTS-scoped policy — never a blanket `true`.

-- ---------------------------------------------------------------------------
-- minyanim: own rows only via REST; anything else via get_minyan_by_id(id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Minyanim are viewable by authenticated users" ON public.minyanim;

-- Creator OR participant (not a blanket read): covers the /success screen
-- reached right after joining someone else's minyan, and realtime updates
-- once joined. Browsing a minyan you haven't joined yet goes through
-- get_minyan_by_id() below instead of a raw table read.
CREATE POLICY "Users can view minyanim they created or joined"
  ON public.minyanim FOR SELECT TO authenticated
  USING (
    creator_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.minyan_participants mp
      WHERE mp.minyan_id = minyanim.id AND mp.user_id = (SELECT auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.get_minyan_by_id(_id uuid)
RETURNS SETOF public.minyanim
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.minyanim WHERE id = _id;
$$;

-- Supabase grants EXECUTE to anon/authenticated by default at creation time;
-- REVOKE ... FROM PUBLIC does not remove those role-specific grants (the same
-- root cause as the nearby_push_recipients leak fixed above) — anon must be
-- revoked explicitly.
REVOKE ALL ON FUNCTION public.get_minyan_by_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_minyan_by_id(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- minyan_participants: own participation rows only (every current call site
-- already filters by user_id = self, so this is a pure tightening, no RPC
-- needed).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Participants viewable by authenticated users" ON public.minyan_participants;

CREATE POLICY "Users can view their own participation"
  ON public.minyan_participants FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- profiles: own profile, or a profile of someone you share a chat thread
-- with (the one cross-user read the app performs, in chat member lookup).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view own profile or shared-thread members"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.chat_thread_members m1
      JOIN public.chat_thread_members m2 ON m2.thread_id = m1.thread_id
      WHERE m1.user_id = (SELECT auth.uid())
        AND m2.user_id = profiles.id
    )
  );
