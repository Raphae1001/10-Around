## Goal
Make the live map real and complete the participation loop (directions → calendar → start confirmation → attendance + trust).

## 1. Real Google Maps map (`/map` + `/home` mini-map)
- Connect **Google Maps Platform** (needed for the JS map, Places search, directions). I'll prompt the connect step.
- Replace mock `MapCanvas` on `/map` with a real `@vis.gl/react-google-maps` map:
  - Loads with `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`.
  - Center = user GPS (fallback: last known / NYC).
  - Pins = live `nearby_minyanim` (1km for street/airport, all "Autres"/Travel).
  - Tap pin → opens the bottom sheet entry for that minyan.
  - Search bar uses Places Autocomplete (New) to recenter.
- Keep the stylized `MapCanvas` only for `/minyan` detail header (small visual).

## 2. Directions to the minyan
- On minyan card / detail: **"Get directions"** button → opens `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=walking` (universal link works on iOS Apple Maps redirect / Google Maps app if installed, browser fallback).

## 3. Add to calendar on join
- When user taps **Join**:
  - Insert into `minyan_participants` (already wired).
  - Trigger `nativeShare`-style calendar add: on native iOS use Capacitor Calendar plugin; on web call existing `downloadIcs()` helper with title `Minyan – <prayer>`, location = address, start = `scheduled_at ?? now()`, duration 20min.

## 4. Start-time confirmations + trust system
Database changes (one migration):
- `profiles.trust_score INT DEFAULT 100`.
- `minyan_confirmations` table: `minyan_id`, `user_id`, `role` ('organizer'|'participant'), `answer` ('yes'|'no'|null), `asked_at`, `answered_at`. RLS: user can read/update own row; organizer can read all for own minyan.
- RPC `request_confirmations(minyan_id)`: creates rows for organizer + all participants, marks `asked_at = now()`.
- RPC `answer_confirmation(minyan_id, answer)`: writes own answer; if participant and `answer='yes'` → `trust_score += 2`; if `'no'` → `trust_score -= 5`.
- pg_cron job every minute: for each minyan where `scheduled_at <= now()` (or `created_at + 10min` for live ones) and no confirmations yet → call `request_confirmations` + insert into a `notifications_outbox` table.

Push delivery:
- New TanStack server route `/api/public/cron/dispatch-confirmations` reads outbox, sends via Apple/FCM later. For V1: client also polls `minyan_confirmations` where `user_id=me AND answer IS NULL` and shows an in-app modal "Did the minyan start / did you make it?" with Yes/No.

UI:
- New `<ConfirmationPrompt>` component mounted in `_authenticated` layout — listens via Realtime to `minyan_confirmations` for current user; shows modal when an unanswered row appears.
- Profile shows live `trust_score` (replace static value).

## 5. Wiring summary
- Files added: `src/components/GoogleMap.tsx`, `src/components/ConfirmationPrompt.tsx`, `src/lib/directions.ts`, migration for trust + confirmations + cron.
- Files edited: `src/routes/map.tsx`, `src/routes/home.tsx` (Join → calendar + directions buttons), `src/routes/minyan.tsx`, `src/routes/profile.tsx` (real trust), `src/routes/_authenticated/route.tsx` (mount prompt).
- Connectors required: **Google Maps Platform** (I'll trigger `standard_connectors--connect`).

## Technical notes
- Maps lib: `@vis.gl/react-google-maps` (modern, no `mapId` required, works with vector or raster).
- Real push (APNs/FCM) deferred — needs Apple Dev account + server keys. For V1 we use Realtime in-app prompts (works while app is open / iOS background fetch later).
- `pg_cron` + `pg_net` are available on Supabase; we'll enable in the migration.

## Confirm before I build
1. OK to connect **Google Maps Platform** now (managed key — free, no setup)?
2. OK to defer real push notifications and use **in-app Realtime prompts** for V1 (real APNs requires your Apple Dev account)?
