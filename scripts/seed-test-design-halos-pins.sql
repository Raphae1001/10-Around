-- TEMP seed for design validation (halos + pins). Marker: [TEST_DESIGN_SEED]
-- Zone Herzliya ~32.179,34.813 → geohash6 sv8z04
-- Cleanup: see scripts/cleanup-test-design-seed.sql

BEGIN;

-- 1) Fake auth users (needed for member_presence FK)
WITH uids AS (
  SELECT * FROM (VALUES
    ('a1111111-1111-4111-8111-111111111101'::uuid, 'test-design-seed-1@minyannow.invalid'),
    ('a1111111-1111-4111-8111-111111111102'::uuid, 'test-design-seed-2@minyannow.invalid'),
    ('a1111111-1111-4111-8111-111111111103'::uuid, 'test-design-seed-3@minyannow.invalid'),
    ('a1111111-1111-4111-8111-111111111104'::uuid, 'test-design-seed-4@minyannow.invalid')
  ) AS t(id, email)
)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  u.id,
  'authenticated',
  'authenticated',
  u.email,
  crypt('test-design-seed', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', '[TEST_DESIGN_SEED]'),
  now(),
  now(),
  '',
  '',
  '',
  ''
FROM uids u
WHERE NOT EXISTS (SELECT 1 FROM auth.users x WHERE x.id = u.id OR x.email = u.email);

-- identities (required on newer Auth)
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
SELECT
  u.id,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.id::text,
  now(),
  now(),
  now()
FROM (VALUES
  ('a1111111-1111-4111-8111-111111111101'::uuid, 'test-design-seed-1@minyannow.invalid'),
  ('a1111111-1111-4111-8111-111111111102'::uuid, 'test-design-seed-2@minyannow.invalid'),
  ('a1111111-1111-4111-8111-111111111103'::uuid, 'test-design-seed-3@minyannow.invalid'),
  ('a1111111-1111-4111-8111-111111111104'::uuid, 'test-design-seed-4@minyannow.invalid')
) AS u(id, email)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
);

-- 2) Presence: 4 members same zone → passes density_min_threshold (3)
INSERT INTO public.member_presence (user_id, zone, last_seen_at, opt_out, presence_level, updated_at)
VALUES
  ('a1111111-1111-4111-8111-111111111101', 'sv8z04', now(), false, 'active_foreground', now()),
  ('a1111111-1111-4111-8111-111111111102', 'sv8z04', now(), false, 'active_foreground', now()),
  ('a1111111-1111-4111-8111-111111111103', 'sv8z04', now(), false, 'active_foreground', now()),
  ('a1111111-1111-4111-8111-111111111104', 'sv8z04', now(), false, 'active_foreground', now())
ON CONFLICT (user_id) DO UPDATE
SET zone = EXCLUDED.zone,
    last_seen_at = EXCLUDED.last_seen_at,
    opt_out = false,
    presence_level = 'active_foreground',
    updated_at = now();

-- 3) Street minyanim: 3(gold), 9(urgent), 10(success)
-- Note: app tone is gold if <9, urgent if >=9 && <10, success if >=10
ALTER TABLE public.minyanim DISABLE TRIGGER enforce_minyan_constraints_trg;

INSERT INTO public.minyanim (
  id, creator_id, type, prayer, nusach, message, address,
  latitude, longitude, is_live, scheduled_at,
  present_count, extra_present, expires_at, created_at
) VALUES
  (
    'b2222222-2222-4222-8222-222222222201',
    'a1111111-1111-4111-8111-111111111101',
    'street', 'mincha', 'Any',
    '[TEST_DESIGN_SEED] gold 3/10',
    '[TEST_DESIGN_SEED] Herzliya Gold',
    32.1790, 34.8130, true, null,
    3, 3, now() + interval '2 hours', now()
  ),
  (
    'b2222222-2222-4222-8222-222222222202',
    'a1111111-1111-4111-8111-111111111102',
    'street', 'mincha', 'Any',
    '[TEST_DESIGN_SEED] urgent 9/10',
    '[TEST_DESIGN_SEED] Herzliya Urgent',
    32.1794, 34.8136, true, null,
    9, 9, now() + interval '2 hours', now()
  ),
  (
    'b2222222-2222-4222-8222-222222222203',
    'a1111111-1111-4111-8111-111111111103',
    'street', 'mincha', 'Any',
    '[TEST_DESIGN_SEED] success 10/10',
    '[TEST_DESIGN_SEED] Herzliya Complete',
    32.1798, 34.8142, true, null,
    10, 10, now() + interval '2 hours', now()
  )
ON CONFLICT (id) DO UPDATE
SET present_count = EXCLUDED.present_count,
    extra_present = EXCLUDED.extra_present,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    is_live = true,
    expires_at = EXCLUDED.expires_at,
    message = EXCLUDED.message,
    address = EXCLUDED.address;

ALTER TABLE public.minyanim ENABLE TRIGGER enforce_minyan_constraints_trg;

COMMIT;

-- Sanity checks
SELECT 'presence' AS kind, zone, COUNT(*)::int AS n
FROM public.member_presence
WHERE user_id IN (
  'a1111111-1111-4111-8111-111111111101',
  'a1111111-1111-4111-8111-111111111102',
  'a1111111-1111-4111-8111-111111111103',
  'a1111111-1111-4111-8111-111111111104'
)
GROUP BY zone;

SELECT id, address, present_count, latitude, longitude, is_live
FROM public.minyanim
WHERE message LIKE '[TEST_DESIGN_SEED]%';
