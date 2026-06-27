-- Run in Supabase Dashboard → SQL Editor (new project jyqregdkmufrxyugrxrp)
-- Imports OAuth identities so Google/Apple logins match migrated users.
-- Note: `email` is a generated column on recent Supabase — do not insert it.

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) VALUES
(
  '5cff9c41-6186-4c13-a275-5717370df881',
  '67b1b67d-4745-4695-8445-657dee5c5d42',
  '{"avatar_url":"https://lh3.googleusercontent.com/a/ACg8ocKsBaOCw0GnUC-9cXTbun41WLdxNqXw9hQV4w8AscOL6JfXRQ=s96-c","email":"raphael.kalf@gmail.com","email_verified":true,"full_name":"Raphael Ka","iss":"https://accounts.google.com","name":"Raphael Ka","phone_verified":false,"picture":"https://lh3.googleusercontent.com/a/ACg8ocKsBaOCw0GnUC-9cXTbun41WLdxNqXw9hQV4w8AscOL6JfXRQ=s96-c","provider_id":"100912142619344710582","sub":"100912142619344710582"}'::jsonb,
  'google',
  '100912142619344710582',
  '2026-06-22 12:57:04.452725+00',
  '2026-06-22 12:57:04.452776+00',
  '2026-06-25 11:08:59.455861+00'
),
(
  '72afb6e2-4708-462e-af9e-bdd11e987293',
  '4c888f94-9a89-472e-b664-cbba64e13c32',
  '{"custom_claims":{"auth_time":1782137657,"is_private_email":true},"email":"9dcyhch2k5@privaterelay.appleid.com","email_verified":true,"iss":"https://appleid.apple.com","phone_verified":false,"provider_id":"000522.0112ab9aab3a43bd9917a63ce677d7aa.1349","sub":"000522.0112ab9aab3a43bd9917a63ce677d7aa.1349"}'::jsonb,
  'apple',
  '000522.0112ab9aab3a43bd9917a63ce677d7aa.1349',
  '2026-06-22 13:49:32.965079+00',
  '2026-06-22 13:49:32.965123+00',
  '2026-06-22 14:14:21.939064+00'
)
ON CONFLICT (id) DO NOTHING;
