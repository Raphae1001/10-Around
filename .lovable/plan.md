
# MinyanNow — Targeted Production Audit

Scope locked to: broken flows, Share, Maps navigation, auth & permissions, DB integrity, mobile responsiveness, store readiness, security, TS/build errors, performance. No UI redesign, no branding/text/color changes, no i18n edits.

## Phase 1 — Static audit (no code changes)

1. **Build & types**
   - `bun run build` and `bunx tsgo --noEmit` → capture every error/warning.
   - `bunx eslint .` for unused vars/imports/dead code.
   - `bunx knip` (or manual scan) for unused files, exports, dependencies in `package.json`.
2. **Routes & flows** — read all 28 routes; map each to a user flow (create / join / leave / share / navigate / auth / profile / chat / travel / kaddish / shabbat / siddur / synagogue / notifications / backup / onboarding / deep-link).
3. **Supabase**
   - `supabase--linter` for RLS, exposed columns, missing indexes.
   - Inspect every `public.*` table: RLS enabled? Policies scoped to `auth.uid()`? `service_role`/`authenticated` GRANTs present? PII exposure?
   - Inspect RPCs for `SECURITY DEFINER` + `search_path` hygiene.
   - Identify missing indexes on `minyanim(location)`, `minyan_participants(minyan_id,user_id)`, `chat_messages(thread_id, created_at)`, `travel_presence(city_key, date_start, date_end)`.
4. **Share + Maps regression check** — Playwright on localhost:8080, restore Supabase session, open a real `/minyan/$id`, click Share and Navigate, assert a real `_blank` navigation (no iframe, no `ERR_BLOCKED_BY_RESPONSE`), screenshot result. Re-test on the published origin URL inside the iframe.
5. **Auth** — verify `_authenticated` gate, OAuth redirect, sign-out hygiene (cancelQueries → clear → signOut → navigate), `attachSupabaseAuth` registered.
6. **Responsive** — Playwright at 375×812 (iPhone), 412×915 (Android), 768×1024 (iPad), 1280×800 (laptop), 1920×1080 (desktop). Screenshot home, create, minyan details, map, chat, profile. Flag overflow, hidden CTAs, tap targets <44px, `h-screen` vs `h-dvh`.
7. **Performance** — bundle analyze (`vite build --mode production` + size report), flag chunks >250KB, identify `useEffect`+`fetch` patterns that should be loaders, unnecessary realtime channels.
8. **Security** — scan for: hardcoded secrets, `dangerouslySetInnerHTML`, unvalidated form input, `window.location.href = userInput`, missing zod validation on `create.tsx`/`profile.tsx`/`travel.tsx`/`flight.tsx`, exposed service role usage from client.
9. **Capacitor / store readiness** — review `capacitor.config.ts`, `IOS_BUILD.md`, `public/manifest.webmanifest`. Check bundle id, app name, icons (1024 iOS, 512 Android adaptive), splash, permissions (location, camera), privacy policy route, `NSLocationWhenInUseUsageDescription` strings, deep-link associated domains, version/build numbers.

## Phase 2 — Auto-fix Critical & High only

Will only touch what the audit flags. Expected categories:

- **Critical**
  - Any TS/build error blocking deploy.
  - Any RLS gap allowing cross-user reads/writes on `profiles`, `minyanim`, `minyan_participants`, `chat_messages`, `travel_presence`, `user_push_tokens`.
  - Missing GRANTs on public tables causing PostgREST permission errors.
  - Client-side admin/service-role usage (should not exist; confirm).
  - Share/Navigate iframe regressions (already fixed; verify no regressions).
  - Auth gate gaps (public route calling `requireSupabaseAuth` loader; missing `attachSupabaseAuth`).
- **High**
  - `confirm()` browser dialog in `minyan.tsx` cancel flow → replace with existing shadcn `AlertDialog` (functional, not visual redesign).
  - Missing zod validation on create/profile forms where invalid data can reach the DB.
  - Missing DB indexes on hot query paths.
  - `h-screen` → `h-dvh` where it causes mobile cutoffs.
  - Icon-only buttons missing `aria-label` on primary CTAs.
  - `useEffect` data fetches in route components that race on unmount (add cancellation if missing).
  - Sign-out missing `cancelQueries`/`clear` (per `tanstack-auth-guards`).
  - PWA/Capacitor blockers: missing icon, missing privacy URL, missing bundle id, etc.

Medium/Low (dead code, unused deps, minor a11y, micro-perf) will be **listed in the report**, not auto-fixed, per your scoping.

## Phase 3 — Verification

- `bun run build` clean.
- `bunx tsgo --noEmit` clean.
- Playwright smoke for: sign-in → create minyan → view details → join → leave → share (assert external nav) → navigate (assert Google Maps URL) → sign out.
- Multi-viewport screenshots saved under `/tmp/browser/audit/`.
- Supabase linter clean (or each remaining warning explained).

## Phase 4 — Final report

A single markdown report including:

- Issue list grouped by severity (Critical / High / Medium / Low) with file:line refs.
- Every change made in Phase 2, with rationale.
- Screenshots from Playwright runs.
- Readiness scores out of 100 for **Web**, **PWA**, **Apple App Store**, **Google Play**, with the concrete blockers behind any score <90.

## Out of scope (per your instructions)

- No visual redesign, no color/font/copy/branding changes.
- No i18n JSON edits.
- No new features.
- No Medium/Low auto-fixes (listed only).
- No DB schema changes beyond GRANTs / RLS / indexes required to close Critical/High findings.

## Technical notes

- DB changes go through `supabase--migration` (one migration per concern) and require your approval before running.
- Playwright runs use the managed Supabase session env vars; if `LOVABLE_BROWSER_AUTH_STATUS` is `signed_out` I'll pause and ask you to sign in once in the preview, then resume.
- Estimated turns: ~6–10 depending on how many Critical/High findings surface.
