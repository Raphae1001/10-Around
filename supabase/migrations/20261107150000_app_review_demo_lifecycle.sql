-- TEMPORARY, for App Store review (see 20261107130000 / 20261107140000).
-- Sample minyan A is now a live "Now" minyan that already has 9 people: whoever joins makes
-- it 10/10, it is confirmed, the chat works, "Directions" works, and ~2 minutes after joining
-- the usual "Did the minyan happen?" prompt appears (yes / no). Once somebody has joined, a
-- sample is NOT rolled forward any more: it ends and is deleted like any real minyan
-- (cleanup_expired_minyanim), and a fresh sample is recreated by the next run (every minute).
-- Sample B stays a scheduled minyan ~55 minutes ahead.
-- Undo with supabase/app-review-demo-revert.sql.

-- Start from a clean slate (nobody has joined the current samples).
DELETE FROM public.minyanim WHERE message LIKE '[App Review demo]%';

CREATE OR REPLACE FUNCTION public.refresh_app_review_demo()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo constant uuid := '00000000-0000-4000-8000-00000000d3a0';
  code text;
  m uuid;
  th uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = demo) THEN
    RETURN;
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', demo, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', demo::text, true);

  FOREACH code IN ARRAY ARRAY['A', 'B'] LOOP
    SELECT id INTO m FROM public.minyanim
     WHERE message = '[App Review demo] Sample minyan ' || code
     ORDER BY created_at DESC LIMIT 1;

    IF m IS NULL THEN
      IF code = 'A' THEN
        INSERT INTO public.minyanim (creator_id, type, prayer, address, latitude, longitude,
                                     extra_present, expires_at, city, message)
        VALUES (demo, 'street', 'mincha', 'Sample location (App Review demo)', 37.3326, -122.0055,
                9, now() + interval '60 minutes', 'Demo', '[App Review demo] Sample minyan A')
        RETURNING id INTO m;
      ELSE
        INSERT INTO public.minyanim (creator_id, type, prayer, address, latitude, longitude,
                                     scheduled_at, expires_at, city, message)
        VALUES (demo, 'scheduled', 'mincha', 'Sample location (App Review demo)', 37.3318, -122.0312,
                now() + interval '55 minutes', now() + interval '95 minutes', 'Demo', '[App Review demo] Sample minyan B')
        RETURNING id INTO m;
      END IF;

      INSERT INTO public.chat_threads (kind, minyan_id, title)
      VALUES ('minyan', m, 'Sample location (App Review demo)') RETURNING id INTO th;
      INSERT INTO public.chat_thread_members (thread_id, user_id) VALUES (th, demo) ON CONFLICT DO NOTHING;
      INSERT INTO public.chat_messages (thread_id, user_id, content)
      VALUES (th, demo, 'Hello! I am the sample member of this demo minyan. Tap the block icon on this message to try blocking.');

    ELSIF NOT EXISTS (SELECT 1 FROM public.minyan_participants WHERE minyan_id = m) THEN
      -- Nobody joined: keep the sample fresh (A "just started", B ~55 minutes ahead).
      IF code = 'A' THEN
        UPDATE public.minyanim
           SET created_at = now(), expires_at = now() + interval '60 minutes',
               confirmed_at = NULL, arrival_deadline = NULL, confirmation_path = NULL,
               awaiting_creator_decision = false
         WHERE id = m AND created_at < now() - interval '5 minutes';
        IF FOUND THEN
          DELETE FROM public.minyan_confirmations WHERE minyan_id = m;
        END IF;
      ELSE
        UPDATE public.minyanim
           SET scheduled_at = now() + interval '55 minutes', expires_at = now() + interval '95 minutes'
         WHERE id = m AND scheduled_at < now() + interval '50 minutes';
      END IF;
    END IF;
  END LOOP;

  -- "Did the minyan happen?" prompt, ~2 minutes after someone joined live sample A.
  INSERT INTO public.minyan_confirmations (minyan_id, user_id, role)
  SELECT p.minyan_id, p.user_id, 'participant'
    FROM public.minyan_participants p
    JOIN public.minyanim a ON a.id = p.minyan_id
   WHERE a.message = '[App Review demo] Sample minyan A'
     AND p.user_id <> demo
     AND p.joined_at < now() - interval '2 minutes'
  ON CONFLICT (minyan_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_app_review_demo() FROM PUBLIC, anon, authenticated;

-- Every minute (it used to be every 10 minutes).
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'refresh-app-review-demo'),
  schedule => '* * * * *'
);

SELECT public.refresh_app_review_demo();
