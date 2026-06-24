# MinyanNow — Final Pre-Launch Hardening Pass

Scope: ship-readiness sweep across security, auth, DB, validation, mobile, a11y, perf, PWA, and store readiness. No branding, copy, color, translation, or product behavior changes. No new features.

## Phase 1 — Re-baseline (read-only, no changes)

- Re-run `bun run build`, `bunx tsgo --noEmit`, `supabase--linter`, `supabase--slow_queries`, `security--run_security_scan`.
- Re-read: `src/routes/__root.tsx`, `src/routes/auth.tsx`, `src/routes/_authenticated/route.tsx`, `src/start.ts`, `src/integrations/supabase/*`, `capacitor.config.ts`, `public/manifest.webmanifest`, `vite.config.ts`, all `src/routes/minyan*`, `home.tsx`, `chat*`, `travel*`, `profile.tsx`, `settings.tsx`, `share.tsx`.
- Inspect every public-schema table's policies + grants via `supabase--read_query` on `pg_policies` and `information_schema.role_table_grants`.
- Fix the hydration mismatch in `ScreenHeader` subtitle on `/home` (SSR vs client geolocation branch) — only because it's a runtime error in current preview.

## Phase 2 — Critical & High fixes (safe, in-scope)

**Auth**
- Add dedicated public `/auth/callback` route; route Google OAuth `redirect_uri` to it; hydrate session then navigate to stored intended path. Keep `_authenticated` managed gate untouched.
- Audit sign-out hygiene already applied; extend to any other sign-out call sites (`cancelQueries` → `clear` → `signOut` → `assign('/auth')`).
- Confirm `attachSupabaseAuth` is registered in `src/start.ts`; no per-child `beforeLoad` gates on `_authenticated/*`.
- Verify no protected server fn is called from a public loader.

**Database (one migration)**
- Drop unnecessary `anon` CRUD grants on user-owned tables; keep `anon SELECT` only where a public policy requires it.
- Add indexes:
  - `chat_messages(thread_id, created_at DESC)`
  - `minyan_participants(minyan_id, user_id)` (also enforce unique if missing)
  - `minyan_confirmations(minyan_id, user_id)` unique if missing
  - `travel_presence(city_key, date_start, date_end)`
  - `minyanim(expires_at)` partial where `expires_at > now()` — skipped if non-immutable; fall back to `(expires_at)`.
- Add CHECK-equivalent **trigger** on `travel_presence` rejecting `date_start > date_end` (trigger, not CHECK, per platform rules).
- Verify `minyan_participants` unique `(minyan_id, user_id)` prevents duplicate joins; add if missing.

**Validation**
- Add Zod schemas where missing on create/edit Minyan and travel forms (dates, coords bounds, address length, extra_present ≥ 0).
- Server-side: rely on existing triggers + add guards in any `createServerFn` that writes.

**Mobile / responsive**
- Replace `min-h-screen`/`h-screen` with `min-h-dvh`/`h-dvh` on full-height route shells only (no visual redesign).
- Ensure bottom CTAs clear iOS safe-area (`pb-[env(safe-area-inset-bottom)]`) where already structured for it.

**Accessibility (High only)**
- `aria-label` on every icon-only `Button size="icon"`.
- Replace `window.confirm()` in `home.tsx` and `minyan.tsx` with shadcn `AlertDialog` (behavior preserved).
- Verify single `<main>` per route; add where missing.

**Performance**
- Audit Supabase realtime channels: unsubscribe on unmount, dedupe per-thread channels.
- Convert any `useEffect+fetch` initial reads on hot routes to `ensureQueryData`+`useSuspenseQuery` only where it removes a render-loop / race.
- Memoize obvious hot lists (`minyan` list rows) only if profiler shows churn.

**PWA**
- Verify `manifest.webmanifest` already updated (id, scope, orientation, maskable). Confirm icons exist at referenced paths; add missing sizes if any are 404 in build output. No service worker added (per PWA skill default).

**App Store / Play readiness**
- Confirm `capacitor.config.ts` appId/appName/allowNavigation already correct.
- Add missing public routes if absent: `/privacy`, `/terms`, `/support`, `/account/delete` (account deletion is required by both stores). Account-delete calls a new authed server fn that revokes session and deletes user data via admin client.
- Verify iOS `Info.plist` strings and Android permissions exist in `IOS_BUILD.md` / capacitor config docs; produce a checklist of remaining native-project edits the user must do in Xcode/Android Studio (cannot be done from this repo).

## Phase 3 — Verification

- `bun run build`, `tsgo --noEmit`, `supabase--linter` all clean.
- Playwright E2E on localhost, full flow: Sign In → Create → Details → Share → Navigate → Join → Leave → Profile → Sign Out.
- Run at 4 viewports: 390×844 (iPhone), 412×915 (Android), 820×1180 (iPad), 1440×900 (desktop). Screenshots saved under `/tmp/browser/launch/`.
- Capture before/after for any perf change (network panel + console).

## Phase 4 — Final report

- Issue list grouped Critical/High/Medium/Low with file:line.
- Every file changed + every migration with rationale.
- Remaining blockers per surface.
- Readiness scores out of 100: Web, PWA, Apple App Store, Google Play.
- Final verdict: READY / NOT READY with justification and the exact native-side steps the user must complete outside this repo (Xcode signing, App Store Connect metadata, Play Console data-safety form, store screenshots).

## Out of scope (confirmed)

- No visual redesign, no copy/translation edits, no color/branding changes.
- No new product features.
- No schema changes beyond indexes, grants, unique constraints, and the travel-range trigger.
- No service worker / offline mode (PWA skill default; not requested).
- Native Xcode/Android Studio project edits are listed as user action items, not performed from this repo.
