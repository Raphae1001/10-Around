
# MinyanNow — Legal, Analytics & Native Readiness Plan

Three coordinated workstreams. No branding, copy-style, color, or business-logic changes. Existing `/privacy` route gets expanded; new routes and infrastructure added.

---

## Workstream 1 — Legal & Compliance Pages

### 1a. `/privacy` (expand existing `src/routes/privacy.tsx`)
Sections (i18n keys reused where present, new EN keys added without touching other locale files):
- Account creation & authentication (email/password, Google, Apple)
- Location usage (foreground only, why, opt-in)
- Push notifications (token storage, purpose)
- Analytics (GA4, Microsoft Clarity, anonymized)
- Data storage (Lovable Cloud / Supabase, region, retention)
- User rights (access, export, deletion, GDPR/CCPA)
- Contact email
- Account deletion process + link to `/settings`

### 1b. `/terms` (new `src/routes/terms.tsx`)
- Acceptance of terms
- User responsibilities
- Minyan creation guidelines (accuracy, no spam, no harassment)
- Community behavior (Halachic respect, no hate speech, moderation)
- Liability limitations & disclaimer of warranties
- Service availability (best-effort, no SLA)
- Governing law placeholder
- Contact

### 1c. `/support` (new `src/routes/support.tsx`)
- Contact email
- FAQ (sign-in, create minyan, notifications, location, languages)
- Bug reporting instructions
- Report inappropriate content (email + in-app TBD)
- Account assistance
- Link to account deletion

### 1d. Footer integration
Add a minimal footer (`src/components/LegalFooter.tsx`) injected into `MobileFrame` bottom or `__root.tsx` shell — three text links (Privacy / Terms / Support) styled with existing tokens, no visual redesign. Verify it does not collide with `BottomNav`.

### 1e. Account deletion (Apple 5.1.1(v) requirement)
- New server function `src/lib/account.functions.ts` → `deleteMyAccount`:
  - `requireSupabaseAuth` middleware
  - Inside handler: lazy-import `supabaseAdmin`
  - Delete `user_push_tokens`, `minyan_participants`, `minyan_confirmations`, `travel_presence`, `chat_messages` (own), `chat_thread_members`, `profiles` for `userId`
  - For `minyanim` where `creator_id = userId`: cancel via existing `cancel_my_minyan` semantics OR null-out PII / hard delete future ones (decide: hard delete; participants get a notification record — out of scope, document as remaining work)
  - `supabaseAdmin.auth.admin.deleteUser(userId)`
- UI: extend `src/routes/settings.tsx` — "Delete Account" row at bottom, opens shadcn `AlertDialog` requiring typed confirmation ("DELETE"), calls server fn, signs out (cancelQueries → clear → signOut → navigate `/auth` replace).

### 1f. Database migration
- Add `ON DELETE CASCADE` on FKs from user-owned tables to `auth.users(id)` where missing, so admin delete fully cleans relational data. Audit each table's existing FK; only add cascade where current behavior is RESTRICT/NO ACTION.

---

## Workstream 2 — Analytics (GA4 + Microsoft Clarity)

### 2a. Centralized service
`src/lib/analytics.ts`:
- Single `track(event: AnalyticsEvent, params?)` API
- Strongly-typed `AnalyticsEvent` union: `sign_up`, `sign_in`, `sign_out`, `create_minyan`, `edit_minyan`, `cancel_minyan`, `join_minyan`, `leave_minyan`, `share_minyan`, `open_maps`, `open_chat`, `update_profile`, `page_view`
- Lazy-loads `gtag` and Clarity scripts on first `track()` (deferred, non-blocking)
- No-ops if measurement IDs absent → safe in dev / disabled state
- Strips PII: never passes `email`, `display_name`, `user_id` directly (uses hashed id if needed)
- Respects user setting `analytics_enabled` (localStorage; default true, toggleable in Settings → Privacy)
- `pageView()` helper wired in `__root.tsx` via TanStack Router `subscribe('onResolved')` listener

### 2b. Script injection
Append GA4 + Clarity `<script>` tags via `<HeadContent>` in `__root.tsx`, gated on `import.meta.env.VITE_GA4_ID` / `VITE_CLARITY_ID`. If env vars not set, no scripts load — zero perf cost.

### 2c. Instrumentation points (locations identified)
- `src/routes/auth.tsx` → `sign_up`, `sign_in`
- `src/routes/settings.tsx` & sign-out sites → `sign_out`
- `src/routes/create.tsx` → `create_minyan`
- `src/routes/minyan.tsx` / `minyan.$id.tsx` → `edit_minyan`, `cancel_minyan`, `join_minyan`, `leave_minyan`, `share_minyan`, `open_maps`, `open_chat`
- `src/routes/profile.tsx` → `update_profile`

### 2d. Privacy / compliance
- Add analytics toggle in Settings → Privacy group
- Disclose in `/privacy` (Analytics section)
- No tracking before auth landing (page_view fires for marketing/index only)
- GDPR-safe: no cross-site identifiers, no ad personalization signals

### 2e. Env vars needed (user must supply later)
`VITE_GA4_ID`, `VITE_CLARITY_ID` — added as documented optional. No `add_secret` call now; user supplies when ready.

---

## Workstream 3 — Native Deployment Readiness

### 3a. Capacitor audit (`capacitor.config.ts`)
Verify already-correct fields; document any required updates:
- `appId` (reverse-DNS: e.g. `app.minyannow`)
- `appName`
- `server.androidScheme: 'https'`
- Deep link scheme + Universal Links / App Links

### 3b. iOS readiness — documentation deliverable `IOS_READINESS.md`
- Bundle ID, version/build strategy (semver + auto-increment build)
- `Info.plist` keys with finalized strings:
  - `NSLocationWhenInUseUsageDescription`: "MinyanNow uses your location to help discover nearby Minyanim and improve community participation."
  - `NSCalendarsUsageDescription`: "MinyanNow can add upcoming Minyan times to your calendar so you don't miss tefilla."
  - `NSContactsUsageDescription` (only if used; omit if not)
  - `NSUserTrackingUsageDescription`: NOT needed unless ATT enabled — confirm GA4/Clarity in Capacitor shell do NOT use IDFA; document as "do not enable ATT"
- Associated Domains / Universal Links setup steps
- Sign in with Apple capability (required because Google sign-in is offered)

### 3c. Android readiness — `ANDROID_READINESS.md`
- Package name
- `AndroidManifest.xml` permissions: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `INTERNET`, `POST_NOTIFICATIONS` (API 33+)
- Intent filters for deep links & App Links (`assetlinks.json` step)
- `targetSdk 34+`
- Adaptive icon foreground/background spec

### 3d. App Store / Play Store compliance review
Single `STORE_COMPLIANCE.md` covering:
- Apple rejection-risk checklist (5.1.1(v) deletion, 4.0 design, 2.1 metadata, sign-in parity if Google → require Sign in with Apple)
- Google Play Data Safety form values (per data type collected)
- Required URLs: privacy, support, account deletion (web-accessible)
- Marketing assets checklist (1024 icon, screenshots per device class, feature graphic 1024×500, App Preview)

### 3e. TestFlight / Internal Testing guide
Append to existing `IOS_BUILD.md` (or new `TESTFLIGHT_GUIDE.md`):
- Xcode archive → Distribute → App Store Connect
- TestFlight internal group setup
- External tester review submission
- Android: signed AAB → Play Console → Internal testing track → closed/open testing promotion

---

## Files changed / created

**New:**
- `src/routes/terms.tsx`
- `src/routes/support.tsx`
- `src/components/LegalFooter.tsx`
- `src/lib/account.functions.ts`
- `src/lib/analytics.ts`
- `supabase/migrations/<ts>_cascade_user_deletion.sql`
- `IOS_READINESS.md`, `ANDROID_READINESS.md`, `STORE_COMPLIANCE.md`, `TESTFLIGHT_GUIDE.md`

**Edited:**
- `src/routes/privacy.tsx` (expanded sections)
- `src/routes/settings.tsx` (Delete Account row + analytics toggle)
- `src/routes/__root.tsx` (footer slot + analytics page_view subscriber + optional GA/Clarity scripts)
- `src/routes/auth.tsx`, `create.tsx`, `minyan.tsx`, `minyan.$id.tsx`, `profile.tsx` (analytics `track()` calls only; no UI/logic changes)
- `src/i18n/locales/en.json` only (new keys; other locales fall back to EN per existing i18n config)
- `capacitor.config.ts` (only if audit finds gaps)

**Out of scope:**
- Translating new copy to 13 non-EN locales (per user constraint: don't touch i18n files — limited EN-only additions accepted as legal copy that cannot be auto-translated safely)
- Native Xcode/Android Studio edits (documented, not executed)
- Actually obtaining GA4/Clarity IDs (user-supplied env vars)
- In-app moderation / report-content backend

## Verification
- `bun run build` clean
- `tsgo --noEmit` clean
- Playwright: load `/privacy`, `/terms`, `/support`; settings → delete flow (cancel only, no real delete); footer links at iPhone / Android / tablet / desktop viewports with screenshots
- Confirm analytics is no-op when env vars absent (no network calls)

## Final report will include
- Readiness scores (Web, PWA, App Store, Google Play)
- Event catalog with file:line trigger sites
- Remaining blockers + effort estimates per store
