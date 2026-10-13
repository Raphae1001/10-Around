-- Product rule: an account with no activity for 5 days is deleted automatically.
-- Activity = account creation, sign-in, or a session refresh (the app refreshes
-- its session token whenever it is opened). Cleanup mirrors the delete-account
-- edge function; everything else cascades from auth.users.
CREATE OR REPLACE FUNCTION public.delete_inactive_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _uid uuid;
  _threads uuid[];
  _deleted integer := 0;
BEGIN
  FOR _uid IN
    SELECT u.id
    FROM auth.users u
    WHERE greatest(
      u.created_at,
      u.last_sign_in_at,
      (SELECT max(greatest(s.updated_at, s.refreshed_at AT TIME ZONE 'UTC'))
         FROM auth.sessions s
        WHERE s.user_id = u.id)
    ) < now() - interval '5 days'
  LOOP
    -- travel_city threads don't cascade: capture them before membership rows go.
    SELECT coalesce(array_agg(thread_id), '{}') INTO _threads
      FROM chat_thread_members WHERE user_id = _uid;

    DELETE FROM minyan_confirmations WHERE user_id = _uid;
    DELETE FROM content_reports WHERE reported_user_id = _uid;
    DELETE FROM auth.users WHERE id = _uid;

    DELETE FROM chat_threads t
     WHERE t.id = ANY(_threads)
       AND t.kind = 'travel_city'
       AND NOT EXISTS (SELECT 1 FROM chat_thread_members m WHERE m.thread_id = t.id);

    _deleted := _deleted + 1;
  END LOOP;
  RETURN _deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_inactive_accounts() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('delete-inactive-accounts');
EXCEPTION WHEN OTHERS THEN
  NULL; -- job may not exist yet
END $$;

SELECT cron.schedule(
  'delete-inactive-accounts',
  '0 3 * * *',
  $$SELECT public.delete_inactive_accounts();$$
);
