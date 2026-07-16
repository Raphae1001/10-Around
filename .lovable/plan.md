## Goal

Replace the OAuth/email sign-in screen with a 10-second name-only onboarding. Keep everything else (DB, RLS, minyan/chat/notifications/profile logic) untouched by giving each device a **real Supabase user** — provisioned via **Supabase Anonymous Authentication** — so `auth.uid()` continues to work exactly like today.

## Why anonymous auth (recommendation)

- Creates a genuine row in `auth.users` → `handle_new_user` trigger still fires, `profiles` row is created automatically, all existing RLS policies (`auth.uid() = …`) continue to apply unchanged.
- Session is persisted by Supabase in device storage and auto-refreshed; survives app restarts. Not just localStorage — backed by a real refresh token tied to a backend identity.
- Zero schema/RLS migrations required. No edge functions needed.
- Future-proof: if you ever want to add real sign-in, `linkIdentity()` upgrades the anonymous user in place without losing their data.

Alternative considered (device-id table + custom JWT via edge function): rejected — would require new auth surface, custom RLS rewrites, and breaks the "treat it exactly like today's authenticated user" guarantee.

## Preservation audit (confirmed safe)

| Area                                                                                           | Impact                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `profiles`, `minyanim`, `minyan_participants`, `chat_*`, `travel_presence`, `user_push_tokens` | No changes. All keyed on `auth.uid()` which anonymous users have.                                                            |
| RLS policies                                                                                   | No changes. Anonymous users authenticate as role `authenticated`, so every existing `TO authenticated` policy still matches. |
| `handle_new_user` trigger                                                                      | Fires for anonymous users too → profile auto-created. We update `display_name` right after with First + Last.                |
| Notifications / push tokens                                                                    | Unchanged — still scoped to `auth.uid()`.                                                                                    |
| Analytics / moderation / ownership                                                             | Unchanged.                                                                                                                   |
| Native deep-link OAuth bridge                                                                  | Becomes dead code path, left in place but unused.                                                                            |

## Changes

### 1. Backend (single config change, no migration)

- Call `supabase--configure_auth` with `external_anonymous_users_enabled: true` (and keep email/google disabled per existing `configure_social_auth` setup).
- No SQL migration needed. Optional tiny cleanup later if desired, but not in this pass.

### 2. New onboarding flow — replace `src/routes/auth.tsx` content

Single screen (reuses existing Logo/Wordmark styling):

- "Welcome to MinyanNow" + subtitle "Please tell us a little about yourself."
- Inputs: **First Name**, **Last Name** (required, trimmed).
- Two permission rows with toggle-style buttons:
  - **Enable Location** → calls existing `use-geolocation` permission request (or `navigator.geolocation.getCurrentPosition` / Capacitor Geolocation on native). Shows ✓ when granted.
  - **Enable Notifications** → on web: `Notification.requestPermission()`; on native: existing push-token registration path used in `user_push_tokens`. Shows ✓ when granted.
  - Both are optional (user can continue without granting; we just record the state).
- Primary **Continue** button:
  1. `supabase.auth.signInAnonymously()` → creates user + session.
  2. Wait for `handle_new_user` trigger (session is already returned synchronously, profile lands within the same request).
  3. `supabase.from('profiles').update({ display_name: \`${first} ${last} }).eq('id', user.id)`.
  4. If notifications granted on native, register the push token into `user_push_tokens` (same code path used today).
  5. Track `onboard_complete` analytics event.
  6. `navigate({ to: '/home' })`.

Route `/auth` itself stays as the file path so existing redirects (`navigate({to:'/auth'})`, deep links, `_authenticated` gate) keep working — it just renders the new onboarding instead of OAuth buttons. Returning users with a valid session are redirected to `/home` on mount (existing logic preserved).

### 3. Profile screen — display-only cleanup (`src/routes/profile.tsx`)

- Show First + Last (split from `display_name`) instead of email.
- Remove the email line under the name.
- Remove the "Sign out" button (no auth to sign out of) — replace with a smaller "Edit profile" entry that opens a tiny inline editor updating `display_name`.
- Keep everything else (stats, trust, recent, backup toggle, settings link) unchanged.
- Settings screen's sign-out button: hide it. Account deletion stays (still calls `account.functions.ts`).

### 4. Splash (`src/routes/index.tsx`)

- "Get started" CTA now routes to `/auth` (the new onboarding) when no session exists, `/home` when a session exists. Already roughly the case — verify and adjust one redirect.

### 5. Native auth code

- `src/lib/native-auth.ts`, `auth.callback.tsx`, `auth.native-start.tsx`: left in place but not invoked. No risk; can be deleted in a follow-up.

## Files touched

- `src/routes/auth.tsx` — rewritten as onboarding screen.
- `src/routes/profile.tsx` — name display, remove email + sign-out, add edit name.
- `src/routes/settings.tsx` — hide sign-out row.
- `src/routes/index.tsx` — verify CTA target.
- `src/i18n/locales/*.json` — new keys: `onboarding.welcome`, `onboarding.firstName`, `onboarding.lastName`, `onboarding.enableLocation`, `onboarding.enableNotifications`, `onboarding.continue`. (English first, others can copy English as fallback.)
- One `configure_auth` tool call to enable anonymous sign-ins.

## Out of scope (untouched, per your instructions)

Minyan create/join/leave, chats, notifications delivery, location queries, analytics events (beyond one new event), reports, moderation, admin, settings (except hiding sign-out), profile functionality (only displayed info changes), all UI outside onboarding/profile.

## Open question

Do you want **first/last stored as two separate columns** in `profiles` (small migration adding `first_name` / `last_name`), or keep using the existing `display_name` field as `"First Last"` (zero migration, split on display)? I recommend the latter — simpler, no schema change, fully reversible.

This proposal looks great.

I only have a few small changes before implementation:

1. Please store `first_name` and `last_name` as two separate columns in `profiles` instead of only using `display_name`.

I think this is the better long-term architecture for search, sorting, personalization, notifications, and future features. `display_name` can simply be generated from those fields when needed.

2. Please keep a way to reset the anonymous account.

Instead of a “Sign out” button, add something like:

- Reset this device
- Start over

This should clear the anonymous session and local data so another person can start fresh on the same device.

3. Validate the onboarding form.

- First name required
- Last name required
- Trim whitespace
- Minimum length
- Maximum reasonable length
- Disable Continue until the form is valid

4. Make the onboarding feel premium.

Instead of looking like a login page, make it feel like a welcome screen.

For example:

“Welcome to MinyanNow”

“Let’s create your profile. This only takes a few seconds.”

Then:

- First Name
- Last Name
- Enable Notifications
- Enable Location
- Continue

Everything else looks exactly like what I want.
