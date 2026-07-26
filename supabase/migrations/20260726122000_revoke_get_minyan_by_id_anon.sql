-- Same root cause as nearby_push_recipients: REVOKE ALL FROM PUBLIC does not
-- remove Supabase's default direct grant to anon. get_minyan_by_id returns
-- the full row (exact coords, creator_id) and must only be callable by
-- signed-in (or guest-authenticated) accounts, never anon.
REVOKE EXECUTE ON FUNCTION public.get_minyan_by_id(uuid) FROM anon;
