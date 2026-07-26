-- nearby_push_recipients returns user_id + raw APNs push token for anyone near
-- an attacker-supplied coordinate. It was created with `REVOKE ALL FROM PUBLIC`,
-- which does not remove Supabase's pre-existing direct grants to anon and
-- authenticated — both still had EXECUTE, making the function callable by any
-- signed-in (or even anonymous-auth) account. It must be service_role only:
-- it's called exclusively via pg_net from cron, never from a client.
REVOKE EXECUTE ON FUNCTION public.nearby_push_recipients(double precision, double precision, integer, uuid)
  FROM anon, authenticated;
