-- TEMPORARY, for App Store review (guideline 2.1: "add posts on the home page").
-- Two sample minyanim by a locked "Demo community member" account, shown to every
-- caller of nearby_minyanim() close to THEIR position, wherever they are, so the
-- reviewer can see them, join them, open their chat and block the demo member.
-- Undo everything with supabase/app-review-demo-revert.sql once the review is over.

-- 1. Locked demo account (nobody can sign in: random password), two minyanim, a chat message.
DO $$
DECLARE
  demo uuid := '00000000-0000-4000-8000-00000000d3a0';
  m record;
  th uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = demo) THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
    VALUES ('00000000-0000-0000-0000-000000000000', demo, 'authenticated', 'authenticated',
            'demo-community@invalid.example',
            extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Demo community member"}', now(), now(), false);
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', demo, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', demo::text, true);

  IF NOT EXISTS (SELECT 1 FROM public.minyanim WHERE message LIKE '[App Review demo]%') THEN
    INSERT INTO public.minyanim (creator_id, type, prayer, address, latitude, longitude,
                                 scheduled_at, expires_at, city, message)
    VALUES
      (demo, 'scheduled', 'mincha', 'Sample location (App Review demo)', 37.3326, -122.0055,
       now() + interval '25 minutes', now() + interval '65 minutes', 'Demo', '[App Review demo] Sample minyan A'),
      (demo, 'scheduled', 'mincha', 'Sample location (App Review demo)', 37.3318, -122.0312,
       now() + interval '55 minutes', now() + interval '95 minutes', 'Demo', '[App Review demo] Sample minyan B');
  END IF;

  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);

  FOR m IN SELECT id, address FROM public.minyanim WHERE message LIKE '[App Review demo]%' LOOP
    SELECT id INTO th FROM public.chat_threads WHERE minyan_id = m.id;
    IF th IS NULL THEN
      INSERT INTO public.chat_threads (kind, minyan_id, title) VALUES ('minyan', m.id, m.address) RETURNING id INTO th;
      INSERT INTO public.chat_thread_members (thread_id, user_id) VALUES (th, demo) ON CONFLICT DO NOTHING;
      INSERT INTO public.chat_messages (thread_id, user_id, content)
      VALUES (th, demo, 'Hello! I am the sample member of this demo minyan. Tap the block icon on this message to try blocking.');
    END IF;
  END LOOP;
END $$;

-- 2. Keep the samples always "starting within the hour" (the cron job moves them forward).
CREATE OR REPLACE FUNCTION public.refresh_app_review_demo()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.minyanim
     SET scheduled_at = now() + CASE WHEN message LIKE '%Sample minyan A' THEN interval '25 minutes' ELSE interval '55 minutes' END,
         expires_at   = now() + CASE WHEN message LIKE '%Sample minyan A' THEN interval '65 minutes' ELSE interval '95 minutes' END
   WHERE message LIKE '[App Review demo]%';
$$;

REVOKE ALL ON FUNCTION public.refresh_app_review_demo() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('refresh-app-review-demo', '*/10 * * * *', 'SELECT public.refresh_app_review_demo();');
SELECT public.refresh_app_review_demo();

-- 3. nearby_minyanim(): unchanged behaviour, plus the samples relocated next to the caller.
CREATE OR REPLACE FUNCTION public.nearby_minyanim(lat double precision, lng double precision, radius_m integer DEFAULT 1000)
RETURNS SETOF minyanim
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT * FROM (
    SELECT m.* FROM public.minyanim m
    WHERE m.expires_at > now()
      AND m.message NOT LIKE '[App Review demo]%'
      AND (
        (m.type = 'street'
          AND extensions.ST_DWithin(m.location, extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography, radius_m))
        OR (m.type = 'scheduled' AND m.scheduled_at IS NOT NULL
          AND extensions.ST_DWithin(m.location, extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography, radius_m))
      )
    UNION ALL
    SELECT (jsonb_populate_record(NULL::public.minyanim, to_jsonb(d) || jsonb_build_object(
             'latitude',  lat + CASE WHEN d.message LIKE '%Sample minyan A' THEN 0.0020 ELSE -0.0015 END,
             'longitude', lng + CASE WHEN d.message LIKE '%Sample minyan A' THEN 0.0010 ELSE 0.0025 END,
             'location',  extensions.ST_SetSRID(extensions.ST_MakePoint(
                            lng + CASE WHEN d.message LIKE '%Sample minyan A' THEN 0.0010 ELSE 0.0025 END,
                            lat + CASE WHEN d.message LIKE '%Sample minyan A' THEN 0.0020 ELSE -0.0015 END), 4326)::extensions.geography::text))).*
    FROM public.minyanim d
    WHERE d.expires_at > now() AND d.message LIKE '[App Review demo]%'
  ) u
  ORDER BY u.created_at DESC;
$$;
