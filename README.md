# 10 Around

Find or start a *minyan* (Jewish prayer quorum) near you, in real time. A React Native–grade mobile app (iOS/Android via Capacitor) plus a web app, built around a privacy-respecting "blurred density" map — the app never stores or shows anyone's exact GPS position, only which ~1 km geohash zone they're in.

Internal code name: `minyannow` (package id, bundle id, Supabase project). The product was renamed 10 Around but the identifiers were kept to avoid re-provisioning App Store / Play Store listings.

---

## What it does

- **Start a minyan on the spot** ("street" type) — pick a location, prayer (Shacharit / Mincha / Maariv), and go live immediately. Expires automatically after 6 hours.
- **Schedule one ahead of time** — a recurring office Mincha, a Shabbat morning service, etc. Visible on the map only within ±30 minutes of its start time; expires after 30 days.
- **Confirm it's actually happening** — once enough people tap "I'm here," the minyan flips to confirmed; the creator can also manually decide if the 10-person threshold wasn't hit by the deadline.
- **See what's around you** — a map with blurred presence "heat" halos (never exact pins for individual people) plus live/scheduled minyanim within ~5 km, and a nearby-list drawer at ~1 km.
- **Traveling?** — declare a multi-day trip ("stay"), see who else is in that city for overlapping dates, and join a per-city chat (`/create-stay`, `/travel-city/:cityKey`).
- **Coordinate in chat** — per-minyan and per-city threads, with in-app content reporting.
- **Zmanim** — halachic prayer times computed locally (Ashkenazi / Sephardi / Chabad opinions) via `kosher-zmanim`, no network call.
- **14 languages**, including Hebrew/Yiddish/Arabic (RTL infra is wired; see [AUDIT.md](AUDIT.md) for current RTL styling gaps).
- Anonymous auth only (first name + last name) — no email/password, no third-party OAuth.

## Who it's for

Observant Jews — especially travelers, people davening outside their regular shul, and anyone short a few people for a minyan — who need to find or assemble ten people quickly, with their exact location kept private from everyone but themselves.

## Current status

This is a working, privately-tested app, not yet live on the App Store / Play Store. Code-level compliance for both stores has been reviewed (see [STORE_COMPLIANCE.md](STORE_COMPLIANCE.md)); the real blocker to launch isn't the app shell, it's cold-start density (an empty map in a new city) and a broken share/deep-link loop for non-installed users — see the [independent product audit](AUDIT.md) for the full, unflinching breakdown. `tsc --noEmit` currently reports a handful of non-blocking TanStack Router search-param type errors.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Routing | TanStack Router (file-based) + TanStack Start for web SSR |
| UI | Tailwind CSS v4, hand-rolled components, `lucide-react` icons |
| i18n | i18next, 14 locales |
| Maps | Google Maps via `@vis.gl/react-google-maps` + `MarkerClusterer` |
| Backend | Supabase — Postgres with RLS, Realtime, Edge Functions, anonymous Auth |
| Mobile shell | Capacitor 8 (iOS + Android) |
| Web hosting | Vercel (Nitro SSR) |

Two distinct build targets, because the mobile app must be a real native bundle, not a website wrapper (Apple guideline 4.2):

- **Web** (`npm run build`) → SSR output for Vercel (`.vercel/output`), entry `src/start.ts` / `src/server.ts`.
- **Mobile** (`npm run build:mobile`) → a static SPA in `dist-mobile/` (config: `vite.mobile.config.ts`, entry `src/main.mobile.tsx`, HTML `index.mobile.html`). Capacitor loads this from disk — `capacitor.config.ts` deliberately has **no `server.url`**. TanStack Start's server-only APIs are stubbed out for this build (`src/lib/mobile/tanstack-start-stub.ts`).

Native projects live in `ios/` and `android/`; see [NATIVE_SETUP.md](NATIVE_SETUP.md) for the full native build/signing setup, [IOS_READINESS.md](IOS_READINESS.md) and [ANDROID_READINESS.md](ANDROID_READINESS.md) for per-platform requirements, and [TESTFLIGHT_GUIDE.md](TESTFLIGHT_GUIDE.md) for shipping a build to testers.

### Project layout

```
src/
  routes/             # TanStack Router file-based screens (see src/routes/README.md)
  components/         # shared UI (GoogleMap, HomeNearbyList, BottomNav, ui-bits, ui/...)
  hooks/              # use-minyanim, use-presence, use-density, use-auth, ...
  lib/                # geo, zmanim, timezone, share, native (Capacitor bridge), ...
  i18n/locales/        # 14 language files
  integrations/supabase/  # generated types + client setup
supabase/
  migrations/         # versioned SQL schema (source of truth for the DB)
  functions/          # Deno edge functions
ios/ android/         # native Capacitor projects
dist-mobile/          # generated mobile SPA build (not committed)
```

### Backend (Supabase)

Core tables: `profiles`, `minyanim` (type: `street` / `scheduled` / `stay`), `minyan_participants`, `minyan_confirmations`, `member_presence` (geohash zone only — exact GPS is never persisted), `chat_threads` / `chat_thread_members` / `chat_messages`, `content_reports`, `user_push_tokens`, `app_config`. RLS is enabled on every table, and the geo lookups (`nearby_minyanim`, `zone_density`, `active_members_count`, …) go through `SECURITY DEFINER` RPCs with a fixed `search_path`.

Edge functions (`supabase/functions/`):
- `delete-account` — full account deletion, called from the client.
- `notify-nearby-minyan` — pushes to users with fresh presence near a new minyan (direct-to-APNs; Android/FCM not wired yet).
- `notify-minyan-confirmed` — pushes when a street minyan is confirmed or a creator decision is needed; triggered server-side via `pg_net`, never by a client.

Schema changes go through `supabase/migrations/*.sql`; there is no ORM.

---

## Getting started

### Prerequisites

- Node 18+ and npm (or Bun — a `bun.lock` is committed)
- A Supabase project (for the database/auth/edge functions)
- A Google Maps browser API key
- For iOS builds: macOS + Xcode + an Apple ID
- For Android builds: Android Studio + JDK

### Setup

```bash
npm install
cp .env.example .env   # fill in the values below
npm run dev             # http://localhost:5173
```

`.env` is git-ignored. Required variables (see `.env.example`):

```bash
# Supabase
SUPABASE_PROJECT_ID=...
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...        # server-only (edge functions/SSR) — never ship to the client
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Production web URL — used for share links and the mobile-app server-fn proxy
VITE_APP_URL=https://<your-app>.vercel.app

# Google Maps
VITE_GOOGLE_MAPS_BROWSER_KEY=...
VITE_GOOGLE_MAPS_TRACKING_ID=...
```

`VITE_GOOGLE_MAPS_BROWSER_KEY` ends up in the client bundle by design — restrict it by HTTP referrer / bundle ID in GCP rather than treating it as secret.

### Useful scripts

| Script | What it does |
|---|---|
| `npm run dev` | Web dev server |
| `npm run build` | Web SSR build (Vercel) |
| `npm run build:mobile` | Mobile SPA build → `dist-mobile/` |
| `npm run cap:sync` | `build:mobile` + `cap sync` (both platforms) |
| `npm run cap:ios` | sync + open Xcode |
| `npm run cap:android` | sync + open Android Studio |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unit tests for zmanim, timezone, geo, sun, publish logic) |
| `npm run format` | Prettier |

### Database

```bash
npx supabase db push --linked                                        # apply migrations
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts  # regen types
npx supabase functions deploy <function-name>                        # deploy an edge function
```

### Mobile builds

```bash
npm run cap:ios       # build + sync + opens ios/App/App.xcworkspace
npm run cap:android   # build + sync + opens android/
```

Full native setup (signing, entitlements, environment wiring): [NATIVE_SETUP.md](NATIVE_SETUP.md).

---

## Key product rules worth knowing before touching the code

- A new **street** minyan is blocked if one already exists within 200 m at the same time slot.
- The **home map** shows `street` + `scheduled` minyanim within ~5 km (`scheduled` only within ±30 min of start); the **drawer list** narrows to ~1 km.
- **`stay`** entries never appear on the map — they only live under Planned.
- A handful of early prototype screens (old travel mockups, synagogue finder, siddur, shabbat times, kaddish, an old `/map`, a diagnostic `/maps-test`) are gated behind `LEGACY_SCREENS_ENABLED = false` in `src/lib/feature-flags.ts` and are unreachable in the shipped product.

## Further reading

- [AUDIT.md](AUDIT.md) — independent, evidence-cited strategic/technical audit (cold-start problem, viral-loop gaps, RLS findings, correctness issues)
- [NATIVE_SETUP.md](NATIVE_SETUP.md) — native iOS/Android setup, source of truth for the Capacitor shell
- [IOS_READINESS.md](IOS_READINESS.md) / [ANDROID_READINESS.md](ANDROID_READINESS.md) — per-platform build & config requirements
- [STORE_COMPLIANCE.md](STORE_COMPLIANCE.md) — Apple/Google policy compliance review
- [TESTFLIGHT_GUIDE.md](TESTFLIGHT_GUIDE.md) — shipping builds to TestFlight / Play internal testing
- [src/routes/README.md](src/routes/README.md) — file-based routing conventions
