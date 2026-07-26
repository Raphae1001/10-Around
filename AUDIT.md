# MinyanNow — Read-Only Strategic + Technical Audit

Audit date: 2026-07-26 · Branch: `test/usage` (from tip of `main`, b15372d)
Method: source files, `supabase/migrations/*.sql`, live Supabase schema/policies cross-check
(project `jyqregdkmufrxyugrxrp`), edge functions, native config, i18n locales, route tree.
Every claim below cites `path:lines`. "NOT FOUND" means I searched and could not find it.

---

## 1. Verdict

**No. As built, MinyanNow cannot survive cold start in a single city, and it will reproduce
Minyan Now (RustyBrick)'s exact failure mode.** There is no seeded/static layer of any kind —
`public.minyanim` has one origin, `creator_id → auth.users` (`20260622124541_…sql:34-54`), so
100% of content is user-generated and a first user in a new city sees a literally empty map plus
"No one around yet — start a minyan" (`src/i18n/locales/en.json` → `home.presence.emptySubtitle`,
rendered at `HomePresenceCard.tsx:96-106`). The reliability layer — the actual differentiator —
exists and is genuinely good (`20260721180000_minyan_confirmation_flow.sql:99-171`), but it can
only confirm minyanim that users create, so it has nothing to be reliable *about* on day one.
The viral loop, which is the only mechanism that could bootstrap density, is broken end to end:
the shared link dead-ends for anyone who has not installed the app and signed in
(`minyan.$id.tsx:12-15` + RLS `minyanim` SELECT `TO authenticated`), universal links are not
actually enabled in the iOS build, and `/share` is a hardcoded mockup of a fictional minyan
(`share.tsx:15-21`). Separately, there is a live, exploitable data leak: `nearby_push_recipients`
is executable by the `anon` role and returns `user_id` + APNs device token for users near an
attacker-chosen coordinate — verified against the live database, not inferred.

---

## 2. Scorecard

| # | Capability | Status | Evidence | Strategic cost of the gap |
|---|---|---|---|---|
| **A. Cold start** ||||
| 1 | New user in a zero-user city gets value | **ABSENT** | `home.tsx:117-118` (auth gate) → `home.tsx:242-253` empty map → `HomePresenceCard.tsx:96-106` empty card; `HomeNearbyList.tsx:137-154` "No minyan nearby yet" | This *is* the failure mode. Uninstall on day 1. |
| 2 | Seeded / static institutional minyan layer | **ABSENT** | Only table is `minyanim` with `creator_id NOT NULL REFERENCES auth.users` (`20260622124541:34-37`). Enum is `('street','stay','scheduled')` (`20260707191500:364`). No `synagogues`/`venues`/`schedules` table in any migration or in live `information_schema` | No base map ⇒ the Waze analogy does not hold. GoDaven's 59k rows remain the only reason to open a minyan app. |
| 3 | Empty state shows near-misses | **ABSENT** | `HomePresenceCard.tsx:96-106` and `HomeNearbyList.tsx:137-154` render static copy + a "Start a minyan" link. No historical query, no "8 people were here last night" | Empty state is a dead end, not a hook. Density history is *deleted* every 5 min (`20260719181500:11-42`), so this data does not even exist to show. |
| **B. Reliability layer** ||||
| 4 | Confirm a minyan is happening / hit 10 | **FULLY BUILT** (for street type only) | State machine `20260721180000:99-171`; creator override `:184-229`; UI `minyan.tsx:320-421` | Strongest asset in the codebase. Wasted on an empty database. |
| 5 | Live count visible before threshold ("7/10") | **FULLY BUILT** | `minyan.tsx:425-446` (56px `present`/10 + progress bar); `HomeNearbyList.tsx:338-344`; map pin label `home.tsx:201-208` | Correct. Progress is public, not hidden. |
| 6 | Data-freshness / staleness decay | **PARTIAL (~40%)** | Presence has freshness: `presence_freshness_minutes=60` live in `app_config`, hard-deleted by `cleanup_stale_presence` (`20260719181500:11-42`). Minyanim have hard TTL `expires_at` (`20260707191500:382-419`: street 6h, scheduled/stay 30d). **NOT FOUND:** any `last_verified_at`, decay score, or "not verified in N days" UI | Works for ephemeral ad-hoc events. There is no concept of a *listing* that ages, because there are no listings — see gap #2. |
| 7 | Report "this minyan did not happen" / time changed | **ABSENT** | `content_reports` is chat-moderation only: columns are `message_id, thread_id, reported_user_id` (`20260716120000:4-15`) — no `minyan_id`. Creator can cancel (`cancel_my_minyan`, `20260721180000:37-66`) or answer the decision prompt (`creator_decide_minyan`, `:184-229`), but **no participant-side negative signal exists** | The reliability layer is single-source (the organizer). No crowd correction ⇒ same rot as GoDaven, just faster. |
| 8 | Realtime participant counts | **FULLY BUILT** | `minyanim` in `supabase_realtime` publication (`20260622124541:159`); `minyan_participants` deliberately *removed* for privacy (`20260622140159:23`) with `present_count` kept in sync by trigger (`20260622124541:117-137`); client subscriptions `use-minyanim.tsx:59-75`, `minyan.tsx:116-131`, `success.tsx:39-52` | Correct and well-reasoned. Not polling. |
| **C. The mourner (avel)** ||||
| 9 | "Occasion" field, incl. Kaddish/aveilut | **ABSENT** | `grep -ri occasion` matches only `en.json` and `it.json` copy — **no `occasion` column** in `minyanim` (verified against live `information_schema.columns`). `/kaddish` route exists but is a hardcoded mock (`kaddish.tsx:38-55`, default value `"Avraham ben Yitzchak"`) and is **disabled**: `beforeLoad: guardLegacyScreen` (`kaddish.tsx:10`) with `LEGACY_SCREENS_ENABLED = false` (`feature-flags.ts:5`) | Your #2 differentiator ships as dead code behind a `false` flag. |
| 10 | Aveilut period / yahrzeit / daily reminders / need-signalling | **ABSENT** | No `aveilut`, `yahrzeit`, `mourning`, `recurring` column or table in any migration. `yahrzeit` appears only as a translation string (`en.json:376`) | The highest-motivation user on earth has no reason to pick you over GoDaven. |
| 11 | Urgency prioritization in notifications/ranking | **ABSENT** | `nearby_push_recipients` (`20260719181500:45-75`) selects purely by geography + freshness. `nearby_minyanim` orders by `created_at DESC` (`20260718210000:38`). No priority field anywhere | — |
| **D. Francophone / Sephardic** ||||
| 12 | i18n infra; French completeness | **FULLY BUILT** | 14 locales wired at `i18n/index.ts:19-34, 55-70`. Key counts: union = 714; `fr` missing 2 (`createStay.addMinyan`, `createStay.addMinyanHint`); `en` missing 7; all 12 others complete. **French is 99.7% complete.** | Genuinely strong. Best-executed part of the differentiation stack. |
| 13 | Hebrew + RTL | **PARTIAL (~50%)** | `he`, `yi`, `ar` locales complete; `document.documentElement.dir` set from `RTL_LANGS` (`i18n/index.ts:38, 81, 89`). **But:** the only RTL-aware styling in the entire codebase is `calendar.tsx:29-30`. Zero `rtl:`/`[dir=` rules in `styles.css`, `components/`, or `routes/` | `dir=rtl` alone will mirror text but leave hardcoded `left-4`/`right-5`/`pl-9`/`text-left` layouts (e.g. `HomePresenceCard.tsx:38`, `create.tsx:187`) visually broken in Hebrew. |
| 14 | Nusach filtering | **PARTIAL (~15%)** | `minyanim.nusach text` column exists (`20260622124541:39`, confirmed live). **Never written** — neither `create.tsx:393-408` nor `create-scheduled.tsx:236-254` sets it. **Never read/filtered** — `nearby_minyanim` (`20260718210000:5-39`) has no nusach predicate; no nusach control in any route. Only UI reference is the unused design-mock `MinyanCard` (`ui-bits.tsx:131, 160`), which no route imports | Column is decoration. Sephardic/Edot HaMizrach users cannot find their nusach — the exact complaint about US-centric incumbents. |
| 15 | Denominational setting / counting logic | **ABSENT** | No `denomination`, `egalitarian`, or `orthodox` token anywhere in `src/` or `supabase/`. Threshold is a hardcoded `NEEDED = 10` (`minyan.tsx:34`, `HomeNearbyList.tsx:235`) and a literal `>= 10` in SQL (`20260721180000:128, 140`) | Fine for an Orthodox-first launch; hard-blocks egalitarian markets later. Decision, not a bug. |
| **E. Venues and scheduling** ||||
| 16 | Non-synagogue venue types | **PARTIAL (~30%)** | Type enum was *narrowed* from `('street','airport','hotel','travel')` to `('street','stay','scheduled')` (`20260707191500:364-379`) — airport→street, hotel→scheduled. Any location is reachable via free-text address + lat/lng (`create-scheduled.tsx:236-254`), so offices/campuses/hospitals *work*, but there is **no venue-type taxonomy** to filter, badge, or seed on | You can hold an office minyan; nobody can search for one. The "zero incumbent coverage" wedge is unaddressable without a type. |
| 17 | Recurring minyanim | **ABSENT** | `grep -ri "recurring\|recurrence\|rrule"` across `src/` + `supabase/` → zero matches. Every row is a single `scheduled_at timestamptz` | "Every Tuesday Mincha at the office" requires 52 manual creations. This is the single biggest supply-side blocker. |
| 18 | Max scheduling horizon | **PARTIAL — and the ad-hoc path is capped exactly like the dead competitor** | `/create` (street) offers **only** `Now, +5, +10, +15, +30, +1 h` — hardcoded, not even i18n'd (`create.tsx:227`). Server clamps street `expires_at` to `now()+6h` (`20260707191500:390-394`). `/create-scheduled` allows an arbitrary future date/time (`create-scheduled.tsx:95-110`), server-clamped to `now()+30 days`. Note: a minyan scheduled >30d out gets `expires_at` clamped to 30d and silently vanishes from `nearby_minyanim` (`20260718210000:18`) before it happens | The primary creation flow is the RustyBrick model verbatim. `/create-scheduled` exists but is a secondary path. |
| **F. Viral loop** ||||
| 19 | Share to WhatsApp | **FULLY BUILT** | `share.ts:55-69` (`whatsapp://` on mobile, `wa.me` on desktop) + `shareAny` cascade `:73-114`; triggered from `minyan.tsx:239-253` with `${appOrigin()}/minyan/${id}` | Mechanically fine. |
| 20 | **CRITICAL — link opens a public web view for a non-installed user** | **ABSENT — hard dead end** | `/minyan/$id` is a client-side `<Navigate>` with no loader and no SSR data (`minyan.$id.tsx:8-15`) → `/minyan?id=`. That page fetches `supabase.from("minyanim")` directly (`minyan.tsx:81-85`). RLS: `"Minyanim are viewable by authenticated users" … TO authenticated USING (true)` (live `pg_policies`) and `REVOKE ALL ON public.minyanim FROM anon` (`20260624211051:8`). **An uninstalled/logged-out user gets zero rows → `notFound` → the string `minyan.notFound` (`minyan.tsx:282-303`).** No "8/10, 300m away". No install CTA. Just "not found." | **This alone kills the growth engine.** Every WhatsApp share converts to a broken page. This is the #1 fix. |
| 21 | Per-minyan Open Graph / preview card | **ABSENT** | OG tags are global and static: `__root.tsx:114-127` ("Start a minyan, anywhere, right now"). `/minyan` and `/minyan/$id` define **no** `head()` (`minyan.tsx:27-32`, `minyan.$id.tsx:8-10`). `og:image` **NOT FOUND** anywhere; `twitter:card` is `summary`, not `summary_large_image` (`__root.tsx:121`) | WhatsApp renders a generic grey card for a time-critical "9/10, 4 min away" message. |
| 22 | Deep links (universal / app links) | **PARTIAL (~35%) — configured but not enabled** | AASA file is correct and complete (`public/.well-known/apple-app-site-association`, paths `/minyan/*`, `/travel-city/*`, `/share/*`). **But `ios/App/App/App.entitlements` contains only `aps-environment`** — no `com.apple.developer.associated-domains`, and `grep CODE_SIGN_ENTITLEMENTS ios/App/App.xcodeproj/project.pbxproj` → **no match**, so the entitlements file is not even attached to the build target. Android: `assetlinks.json` still has `REPLACE_WITH_UPLOAD_KEY_SHA256` placeholders, and `AndroidManifest.xml:20-31` has only LAUNCHER + `minyannow://auth-callback` — **no `https` VIEW intent-filter** | Deep links do not work on either platform today. Taps open Safari/Chrome → the dead-end page from #20. |
| 23 | Invite / referral / notify-contacts | **ABSENT** | No referral code, invite table, or contacts permission. `/share`'s "smart targeting" checkboxes (`share.tsx:106-112`) are non-functional `defaultChecked` inputs with no handler. `/share` itself is a **hardcoded mockup**: "Aaron's Loft · 225 W 35th St", "Mincha at 13:30", `https://minyanlive.app/m/aaronloft` (`share.tsx:15-21`) — a domain that is not `appOrigin()` | No compounding loop. Growth is linear at best. |
| **G. Gabbai tooling** ||||
| 24 | Claim a location, manage recurring times | **ABSENT** | No `venues`/`claims`/`gabbai`/`roles` table. `minyanim` is owned by an individual `creator_id`; only that user can update or cancel (`20260724090000:82-87`) | No supply-side operator. Without this you must hand-enter every schedule yourself. |
| 25 | Moderation / trust beyond UGC | **PARTIAL (~35%)** | `content_reports` exists for chat (`20260716120000`), read-back is service-role only. `profiles.trust_score integer` exists (live schema) but is **never written or read** in `src/` (only `TrustBadge` in the disabled mock `synagogue.tsx:33`). `/trust` route is gated off (`LEGACY_SCREENS_ENABLED=false`) | Adequate for App Store 1.2 compliance; no minyan-level trust. |

---

### Part 2 — Technical & halachic correctness

| # | Item | Status | Evidence & finding |
|---|---|---|---|
| 26 | Shabbat / Yom Tov handling | **ABSENT** | `/shabbat` is a hardcoded mock (`shabbat.tsx:13-37`, "Park Avenue Shul", "16:42") **disabled** by `guardLegacyScreen` (`:9`). No Shabbat mode, no candle-lighting cutoff, no pre-Shabbat planning digest, no quiet-hours enforcement — the `notif.quiet` toggle in settings is rendered `disabled` (`settings.tsx:206`). The confirmation flow *requires* in-app interaction: joiners must tap ready/wait (`minyan.tsx:491-506`), and the creator gets a decision prompt with 10-minute-scale deadlines (`20260721180000:157-166`). **An observant user cannot participate in your core loop on Shabbat or Yom Tov — i.e. the highest-attendance davening of the week is structurally excluded.** |
| 27 | Zmanim | **PARTIAL (~20%)** | `src/lib/sun.ts` implements NOAA solar position from scratch — no library (no `hebcal`, no `@hebcal/core`, no `kosher-zmanim`; `grep` → zero matches). It computes only *alot hashachar* (−16.1°, `:52`), *chatzot* (solar noon, `:99`) and *shkia* (−0.833°, `:44`), and uses them for exactly one thing: a 3-way `shacharit\|mincha\|maariv` default in the create form (`create.tsx:108-112`, `create-scheduled.tsx:53-59`) and a day/night theme switch. **NOT FOUND:** sof zman kriat shema, sof zman tefilla, mincha gedola/ketana (explicitly folded away, `sun.ts:105-109`), plag hamincha, tzeit hakochavim, candle lighting. Minyan times are pure wall-clock. **BUG (see #28.5)** — the window logic is wrong in East Asia / Australia / NZ. |
| 28 | Timezones | **PARTIAL — 3 real bugs** | See dedicated section below. |
| 29 | Geo model | **PARTIAL** | Two independent models. (a) Minyanim: **PostGIS**, `GEOGRAPHY(POINT,4326)` with a GIST index (`20260622124541:44, 56`), `ST_DWithin` radius queries (`20260718210000:20-36`). Scales fine. (b) Presence: **geohash-6** text (`20260707191500:49-51`), radius resolved by `_geohash6_zones_in_radius` (`:187-223`) which iterates candidates filtered by `left(zone,3) = left(center,3)` — a **prefix filter, not a neighbour walk**, so users on the far side of a geohash-3 boundary (~156 km cells) are silently invisible to density, count, *and* push. Notification radius is a **hardcoded `const radius = 1000`** in `notify-nearby-minyan/index.ts:166` — the `notif_radius_m` config key exists in `app_config` (value 1000) but is **never read**. Not user-configurable; `profiles.backup_radius_m` exists in the schema but is unused. |
| 30 | Offline | **ABSENT (~10%)** | Only durable cache is the last GPS fix in `localStorage` (`use-geolocation.tsx:9-17, 36`). Minyan and density caches are **in-memory `Map`s** that die on app restart (`use-minyanim.tsx:10-12`, `use-density.ts:20-23`). No service worker (`public/` has none). `@capacitor/network` is in `package.json:26` but **imported nowhere in `src/`** — no offline detection, no offline banner. A traveller in an airport with bad signal sees a blank map and no error explanation. |
| 31 | Push notifications | **PARTIAL (~55%) — not deliverable today** | Server side is real: APNs HTTP/2 + ES256 JWT, hand-rolled, in both `notify-nearby-minyan/index.ts:38-108` and `notify-minyan-confirmed/index.ts:36-85`; cron→pg_net→edge via Vault-stored key (`20260721180000:71-95, 176-182`); 3-per-6-hours cap (`notify-nearby-minyan:186-197`). Types present: **"minyan forming near you"** = `nearby_minyan` (`:202-203`) ✅ and **minyan confirmed / creator decision** (`notify-minyan-confirmed:134-148`) ✅. **"your minyan needs 2 more" — NOT FOUND** (no threshold-proximity trigger anywhere). Breaks: (a) `App.entitlements` has `aps-environment=development` and is **not linked via `CODE_SIGN_ENTITLEMENTS`** → device registration fails; (b) Android has **no FCM path at all** — non-APNs tokens are logged as `nearby_minyan_queued` and dropped (`:239-246`); (c) the token is captured **only during the onboarding/auth flow** (`auth.tsx:37-41` → `:148-152`) — existing users never re-upsert a rotated token; (d) there is **no `pushNotificationActionPerformed` listener** anywhere in `src/`, so tapping a push opens the app cold with no navigation to the minyan; (e) settings toggles are shipped `disabled` with "coming in a future update" (`settings.tsx:195-206`). |
| 32 | **RLS audit — 1 critical leak + 2 systemic over-shares** | **CRITICAL** | See dedicated section below. |
| 33 | Privacy / location precision | **MIXED — good for presence, exact for minyanim** | Presence is genuinely well-designed: the client sends **only** a geohash-6 zone (~1.2×0.6 km), never lat/lng (`use-presence.ts:54, 59`; server rejects anything else, `20260707191500:248-250`); `member_presence` has **no SELECT policy at all** (live `pg_policies` — only INSERT/UPDATE/DELETE), reads go through aggregate SECURITY DEFINER RPCs with a `density_min_threshold` floor (`:300`); opt-out and a 3-level `presence_level` (`off/ponctual/active_foreground`) exist and are exposed in settings (`settings.tsx:173-191`); rows are hard-deleted after 60 min (`20260719181500:11-42`). **However**: `density_min_threshold` is currently **`1`** in live `app_config` (was 3), so a single-person zone is now published — the k-anonymity floor is effectively off. And `minyanim` stores/exposes **exact** `latitude`/`longitude` with no coarsening, readable by every authenticated user worldwide (see #32). |
| 34 | Analytics — can you measure density/activation/critical mass? | **ABSENT for your actual questions** | GA4 + Microsoft Clarity, lazily loaded, opt-out respected (`analytics.ts:12-13, 40-48, 61-98`). Event vocabulary is fixed at `analytics.ts:15-29`: `create_minyan, join_minyan, share_minyan, open_chat, …`. **No geography is ever sent** — `create_minyan` emits `{type, prayer, scheduled}` (`create.tsx:422-426`), `join_minyan` emits `{minyan_id, ready_now}` (`use-minyanim.tsx:86`). No city, no neighbourhood, no zone. Worse, the raw material is destroyed: `cleanup_stale_presence` **deletes** presence rows every 5 minutes (`20260719181500:38-42`) and `cleanup_expired_minyanim` purges minyanim, and there is **no events/history/metrics table** in any migration. **You cannot answer "did Sarcelles reach critical mass?" or "what is D7 retention for a mourner?" — not with more queries, not at all, because the data no longer exists. You are flying blind.** |

---

## 2b. Timezone bugs (item 28) — specifics

**No timezone column exists on `minyanim`** (verified against live `information_schema.columns`:
`id, creator_id, type, prayer, nusach, message, address, latitude, longitude, is_live,
scheduled_at, trip_start_date, trip_end_date, present_count, expires_at, created_at, updated_at,
location, extra_present, trip_prayer_interests, city, confirmed_at, confirmation_path,
arrival_deadline, awaiting_creator_decision`). All instants are `timestamptz` (correct), but the
venue's local time is never captured. Three concrete defects follow:

1. **Cross-timezone scheduling is wrong.** `create-scheduled.tsx:214`:
   `const scheduledAt = new Date(\`${date}T${time}\`)` — a bare `YYYY-MM-DDTHH:mm` string is
   parsed in the **device's** timezone. Schedule "Mincha 13:30" for a Jerusalem address while
   sitting in Paris and it is stored as 13:30 **Paris** time = 14:30 Jerusalem. This is squarely
   in your traveller use case and there is no guard against it.
2. **Date-picker floor uses UTC.** `create-scheduled.tsx:67`:
   `new Date().toISOString().slice(0,10)` feeds `min=` on the date input (`:98`). A user in
   Israel at 01:00 local (22:00 UTC previous day) gets `min` = yesterday; a user in Los Angeles
   at 18:00 local (01:00 UTC next day) is **blocked from scheduling anything later today**.
3. **All display renders in the viewer's timezone, not the venue's.** `minyan.tsx:334-337`
   (`toLocaleString`), `:244`, `:382-385`, `home.tsx:227-230`. Combined with (1), a Paris user
   viewing a Tel Aviv minyan sees a third, different wall-clock time. (Relative countdowns —
   `HomeNearbyList.tsx:248-257`, `minyan.tsx:38-40` — are delta-based and therefore correct.)
4. **`created_at` is used as a deadline for "Now" street minyanim.** `20260721180000:117`
   (`_deadline := COALESCE(_m.scheduled_at, _m.created_at)`) means a minyan created with
   `when = "Now"` is already past its confirmation deadline at the first cron tick, so it goes
   straight to `awaiting_creator_decision` (`:157-166`) within ~60 s. Correct only if that is
   deliberate; it is not documented as such.
5. **`sun.ts` prayer-window logic breaks east of ~UTC+6.** `crossingTimesUtcMin`
   (`sun.ts:85-100`) returns minutes-since-**UTC**-midnight and can be negative or >1440
   (`solarNoon = 720 − 4·lng`). `currentPrayerWindow` (`:120-123`) compares those against
   `nowMin`, which is always in `[0,1440)`, **with no modular wraparound**. Worked example,
   Auckland (lng ≈ 175°E): solar noon ≈ 20, alot.rise ≈ −380, shkia.set ≈ 380; at 08:00 local
   (= 20:00 UTC prior day, `nowMin` = 1200) neither branch matches and the function returns
   `"maariv"` — the create form pre-selects **Maariv at 8 a.m.** Same class of failure for
   Beijing at 06:00 local. Fine for Europe/Israel/Americas; wrong for East Asia, Australia, NZ.

---

## 2c. RLS audit (item 32) — findings

Cross-checked live `pg_policies` and `pg_proc.proacl` against the migration files. They agree.

### 🔴 CRITICAL — `nearby_push_recipients` is callable by `anon` and returns device tokens

`public.nearby_push_recipients(lat, lng, radius_m, exclude_user_id)` is `SECURITY DEFINER`
(`20260719181500:45-56`) and returns `TABLE(user_id uuid, token text)` — i.e. an account
identifier plus a raw APNs device token — for every user with fresh presence near an
attacker-supplied coordinate.

Live ACL:
```
nearby_push_recipients → {postgres=X, anon=X, authenticated=X, service_role=X}
```
Verified executable: `SET LOCAL ROLE anon; SELECT count(*) FROM public.nearby_push_recipients(...)`
returns successfully (0 rows only because the presence table is currently near-empty), **not** a
permission error. Every other geo RPC (`zone_density`, `active_members_count`, `nearby_minyanim`,
`list_city_peers`, `planned_minyanim`) correctly shows `{postgres, authenticated, service_role}`.

**Root cause:** the migration wrote `REVOKE ALL … FROM PUBLIC` (`20260719181500:77`) and granted
service_role — but Supabase's default privileges had already issued a **direct grant to `anon`**,
which `REVOKE … FROM PUBLIC` does not remove. The blanket "revoke from PUBLIC, anon on every
function" sweep (`20260624211456:12-21`) ran a month *before* this function existed, and the
later hardening pass (`20260724090000:12-16`) revoked four other cron functions but not this one.

**Impact.** The publishable/anon key ships inside the app bundle and the web app. An attacker
sweeps geohash-3 cells (32³ ≈ 32,768 globally; a few hundred cover Europe) and harvests
`user_id` + APNs token for every active user, correlated to a ~156 km cell and refined to ~1 km
by binary-searching the radius. That is a global roster of active users of a Jewish prayer app
with their approximate locations and push tokens. **Fix before any public launch.**

### 🟠 `minyanim` SELECT is `USING (true)` for every authenticated user

`"Minyanim are viewable by authenticated users" … TO authenticated USING (true)` (live; created
`20260622124541:79-80`). The RPCs enforce a radius, but PostgREST does not: any signed-in
account can `GET /rest/v1/minyanim?select=*` and pull **every** minyan on earth with exact
`latitude`/`longitude`, `address`, `scheduled_at`, `message` and `creator_id`. Guest sign-in is
offered (`auth.tsx:27` `Method = "apple" | "google" | "guest"`), so the cost of an account is
zero. Combine with the next item for a full deanonymisation chain.

### 🟠 `minyan_participants` SELECT is `USING (true)` + `profiles` SELECT is `USING (true)`

- `"Participants viewable by authenticated users" … USING (true)` (live; `20260622124541:107-108`)
  — every signed-in user can list the `user_id` of every attendee of every minyan.
- `"Profiles are viewable by authenticated users" … USING (true)` (live). Column grants limit the
  exposed columns to `id, display_name, avatar_url, language, created_at, updated_at`
  (`20260622140159:3-5`) — sensitive columns are protected — but the **row set is unrestricted**,
  so the whole user directory (names + avatars) is enumerable.

Chained: `minyanim` (exact coords + time) ⋈ `minyan_participants` (user_id) ⋈ `profiles`
(display name + avatar) = *"Person X was at 48.8721, 2.3327 at 13:30 on Tuesday."* The team was
careful enough to strip `minyan_participants` from the realtime publication for exactly this
reason (`20260622140159:20-23`) and to hide organizer names in the UI (`minyan.tsx:305-306`) —
but the underlying REST table is wide open, so the UI-level privacy is cosmetic. For a Jewish
location app this is the highest-consequence data model in the product.

### 🟡 Lower severity
- `app_config` and `push_notification_log` have RLS enabled with **no policies** — deny-by-default,
  so safe, but flagged by the advisor as unintentional-looking.
- `pg_net` installed in `public` (advisor WARN).
- Leaked-password protection disabled in Supabase Auth (advisor WARN).
- 20+ `SECURITY DEFINER` functions reachable by `authenticated` — most are intentional; worth a
  deliberate pass now that one of them turned out to be the critical leak above.

### ✅ Done well
- `member_presence` has **no SELECT policy** — reads only via aggregate RPCs. Correct design.
- Client sends geohash only, server validates the format and refuses lat/lng (`20260707191500:248-250`).
- `user_notifications` / `minyan_confirmations` have explicit `WITH CHECK (false)` insert-blocks.
- `user_push_tokens` is strictly owner-scoped… *at the table level*. The leak above bypasses it.
- `_call_edge_function` reads the service key from Vault, never inline (`20260721180000:71-95`).

---

## 3. Critical gaps — ranked by severity

**Severity = "does this replicate RustyBrick's death, or expose users?"**

1. **`nearby_push_recipients` is anon-executable and leaks user IDs + push tokens.**
   Not a growth issue — a safety issue for a religious-minority user base. One `REVOKE` fixes it.
   *(§2c, `20260719181500:45-78`)*
2. **No base layer. 100% of content is user-generated.** The Waze thesis is stated but not
   implemented: you built the live layer and skipped the map. City #1 opens to an empty screen.
   *(`20260622124541:34-37`, `HomePresenceCard.tsx:96-106`)*
3. **The shared link dead-ends.** Public web view is absent; RLS blocks `anon`; universal links
   are not enabled in the build; per-minyan OG tags don't exist; `/share` is a mockup of a
   fictional minyan. Every one of the four links in the viral chain is broken.
   *(`minyan.$id.tsx:12-15`, `minyan.tsx:282-303`, `App.entitlements`, `__root.tsx:114-127`,
   `share.tsx:15-21`)*
4. **`minyanim` + `minyan_participants` + `profiles` are all world-readable to any signed-in
   account, including a guest.** Exact coordinates + attendee identity. *(§2c)*
5. **The primary creation flow is capped at +1 hour** — RustyBrick's model verbatim.
   *(`create.tsx:227`)*
6. **No recurrence.** Kills gabbai/office/campus supply, which is the only realistic way to seed
   density without hand-entering data. *(zero matches for `recurring|rrule`)*
7. **The mourner is not modelled at all** — no occasion, no aveilut, no yahrzeit, and `/kaddish`
   is dead code behind `LEGACY_SCREENS_ENABLED = false`. Your stated #2 differentiator does not
   exist in the shipping product. *(`feature-flags.ts:5`, `kaddish.tsx:10`)*
8. **You cannot measure anything geographic.** No city dimension on events, and presence history
   is deleted every 5 minutes. You will not know whether city #1 worked. *(`analytics.ts:15-29`,
   `20260719181500:38-42`)*
9. **Push is not deliverable end to end** (entitlement unlinked, no FCM, no tap handler, tokens
   captured only at onboarding) — so the one mechanic that converts nearby presence into
   attendance is inert. *(`App.entitlements`, `notify-nearby-minyan:239-246`, `auth.tsx:37-41`)*
10. **Shabbat is structurally excluded** — the confirmation loop requires phone interaction on the
    highest-attendance day of the week. *(`shabbat.tsx:9`, `minyan.tsx:491-506`)*
11. **Nusach column is inert; RTL is `dir`-only.** Both Francophone/Sephardic pillars are
    one layer short of real. *(`20260622124541:39`, `calendar.tsx:29-30`)*
12. **Timezone bugs** make cross-timezone scheduling silently wrong, and `sun.ts` mis-picks the
    prayer east of ~UTC+6. *(§2b)*

---

## 4. Gap-filling plan

Effort: **S** ≤ 2 days · **M** ≈ 1 week · **L** ≈ 2–4 weeks.

| # | What to build | Files / tables touched | Effort | Depends on |
|---|---|---|---|---|
| G1 | `REVOKE EXECUTE ON FUNCTION public.nearby_push_recipients(...) FROM anon, authenticated;` + audit every SECURITY DEFINER function's real `proacl` (not just the migration text) | new migration | **S** | — |
| G2 | Scope `minyanim` SELECT to a bounded radius or route all reads through the existing RPCs; replace `minyan_participants` SELECT `true` with membership-scoped; replace `profiles` SELECT `true` with "profiles of people I share a minyan/thread with" | new migration; verify `minyan.tsx:81-85`, `HomeNearbyList.tsx:48-54`, `success.tsx:28-32` still work | **M** | G1 |
| G3 | **Public share page.** New SSR route `/m/$id` with a server loader using the service role (or a narrow `public_minyan_summary(uuid)` SECURITY DEFINER RPC granted to `anon` returning **only** prayer, coarse address, `present_count`, `scheduled_at`, `confirmed_at` — never exact coords, never `creator_id`). Per-route `head()` with `og:title` = "9/10 · Mincha · 300 m", `og:image` (dynamic OG endpoint), `twitter:card: summary_large_image`. Install CTA + "open in app" | new `src/routes/m.$id.tsx`; new migration; `__root.tsx`; `share.ts:appOrigin` | **M** | G2 (policy shape) |
| G4 | **Enable deep links.** Add `com.apple.developer.associated-domains` to `App.entitlements` **and** wire `CODE_SIGN_ENTITLEMENTS` in the Xcode target; add `https` `VIEW` intent-filter with `android:autoVerify="true"`; fill real SHA-256 fingerprints in `assetlinks.json`; add a `pushNotificationActionPerformed` + `appUrlOpen` listener that routes to `/minyan?id=` | `ios/App/App/App.entitlements`, `project.pbxproj`, `AndroidManifest.xml`, `public/.well-known/assetlinks.json`, `src/lib/native.ts` | **S** | Apple Developer enrolment |
| G5 | Replace the `/share` mockup with the real minyan (id, live count, real `appOrigin()` URL); delete the fake targeting checkboxes or make them work | `share.tsx:15-21, 101-113` | **S** | G3 |
| G6 | **Base layer — schema.** `venues` table (`id, name, address, lat/lng, geography, venue_type enum('synagogue','office','campus','hospital','hotel','airport','military','outdoor','other'), nusach, denomination, city_key, claimed_by, verified_at, source`) + `venue_schedules` (`venue_id, prayer, weekday_mask, time_local, time_rule enum('fixed','relative_to_shkia',…), offset_min, timezone, active_from/to`) + a `minyanim.venue_id` FK. Extend `nearby_minyanim` to union materialised schedule occurrences with live rows | new migration; `use-minyanim.tsx`; `home.tsx`; `HomeNearbyList.tsx` | **L** | — |
| G7 | **Seed city #1.** Import ~150–400 real schedules for one metro into `venues`/`venue_schedules` (scrape/partner/manual). Non-engineering work but blocks everything downstream | data pipeline / `scripts/` | **M** | G6 |
| G8 | **Confirm/deny a seeded listing.** `venue_schedule_reports(schedule_id, user_id, verdict enum('happened','did_not_happen','time_changed'), observed_time, created_at)` + `last_verified_at` on the schedule + a freshness badge ("verified 2 h ago" / "not verified in 60 days") in the UI. **This is the actual product** — it is what turns a static import into the reliability layer | new migration; `minyan.tsx`; `HomeNearbyList.tsx` | **M** | G6, G7 |
| G9 | **Recurrence.** `recurrence_rule` (weekday mask is enough; skip full RRULE) on `venue_schedules` **and** on user-created minyanim; occurrence materialiser in cron; "repeats weekly" toggle in `/create-scheduled` | migration; `create-scheduled.tsx`; `planned.tsx` | **M** | G6 |
| G10 | **Raise the ad-hoc horizon.** Replace the `Now…+1 h` chip row with a proper time picker (today/tomorrow + free time), keep the anti-duplicate check, raise the street `expires_at` clamp | `create.tsx:227, 363-391`; `20260707191500:390-394` | **S** | — |
| G11 | **Mourner mode.** `minyanim.occasion enum('regular','kaddish','yahrzeit','shloshim','shiva','simcha')`; `user_obligations(user_id, kind, start_date, end_date, deceased_name, hebrew_date)`; 11-month aveilut auto-window; daily reminder tied to the next viable minyan; `occasion='kaddish'` boosts push priority and list ranking; re-enable `/kaddish` against real data | migration; `create.tsx`; `minyan.tsx`; `notify-nearby-minyan`; `kaddish.tsx`; `feature-flags.ts:5` | **L** | G6 (venue targets), G13 (push) |
| G12 | **"Needs 2 more" push.** New cron branch in `check_minyan_confirmation` firing at `yes ∈ [7,9]` and `deadline − now ≤ 20 min`, targeting `nearby_push_recipients` (post-G1, service-role only) | `20260721180000:99-171`; `notify-nearby-minyan` | **S** | G13 |
| G13 | **Finish push.** Entitlement linkage (G4), FCM v1 service account for Android, token re-upsert on every session restore (not just onboarding), tap→deep-link handler, enable the settings toggles | `auth.tsx:37-41`; `src/lib/native.ts:96-109`; `notify-nearby-minyan:239-246`; `settings.tsx:195-206`; new `notify` edge fn | **M** | G4 |
| G14 | **Analytics you can steer by.** Add `city_key`/`zone` to every `create_minyan`/`join_minyan`/`share_minyan` event; add a `metrics_daily(city_key, date, active_users, minyanim_created, minyanim_confirmed, join_rate)` table written by cron **before** `cleanup_stale_presence` deletes the evidence; a simple internal dashboard | `analytics.ts:15-29`; `create.tsx:421-427`; `use-minyanim.tsx:84-89`; new migration + cron | **M** | — |
| G15 | **Timezone correctness.** Add `timezone text` to `minyanim`/`venues`, resolve it from the picked place, construct `scheduled_at` in the **venue's** zone, render venue-local with an explicit label, replace the UTC `min=` date floor with a local one | `create-scheduled.tsx:67, 214`; `minyan.tsx:334-337`; `AddressAutocomplete.tsx`; migration | **M** | — |
| G16 | **Fix `sun.ts` wraparound.** Normalise crossing times and `nowMin` into a common modular frame; add tests for Auckland, Beijing, Anchorage, Reykjavík | `sun.ts:85-124` | **S** | — |
| G17 | **Nusach, for real.** Write `nusach` on create (Ashkenaz/Sefard/Edot HaMizrach/Chabad/Teiman), filter in `nearby_minyanim`, filter chip in the list, store a preferred nusach on the profile | `create.tsx`; `create-scheduled.tsx`; `nearby_minyanim`; `HomeNearbyList.tsx`; `profile.tsx` | **S** | — |
| G18 | **RTL pass.** Convert directional utilities to logical properties (`ps-`/`pe-`/`start-`/`end-`), audit every absolutely-positioned element, QA in Hebrew | `styles.css`; all of `src/components/`, `src/routes/` | **M** | — |
| G19 | **Shabbat mode.** Friday pre-Shabbat digest (candle-lighting-aware, computed from `sun.ts`+G16); suppress all push from candle-lighting to havdalah; allow a minyan to be marked as recurring-Shabbat so it needs no in-Shabbat confirmation; re-enable `/shabbat` against real data | `sun.ts`; `notify-*`; `shabbat.tsx`; `feature-flags.ts` | **M** | G9, G13, G16 |
| G20 | **Gabbai tooling.** Claim flow on `venues` (`claimed_by`, `verified_at`), operator screen to edit `venue_schedules`, lightweight verification (email at the shul's domain / manual) | migration; new route | **L** | G6, G7 |

---

## 5. Prioritized roadmap — ordered strictly by "what unblocks density in ONE city"

### Phase 0 — Do not launch without these (days, not weeks)
1. **G1** — revoke `anon`/`authenticated` on `nearby_push_recipients`. Hours of work; it is a
   token + location leak that is live right now.
2. **G2** — close the `minyanim` / `minyan_participants` / `profiles` world-read. A guest account
   currently maps every user of a Jewish app to a coordinate and a time.
3. **G16** — 30-line wraparound fix in `sun.ts`.

### Phase 1 — Make the app non-empty on day one (this is the whole ballgame)
4. **G6 → G7** — venues + schedules schema, then **seed one metro**. Pick the city where you can
   personally verify the data and where the Francophone/Sephardic wedge is real (Sarcelles /
   Paris 19e / Créteil, or Jerusalem's French community). Everything else is decoration until a
   cold-start user sees ~200 real minyan times.
5. **G8** — confirm/deny on those seeded listings. **This is the product.** GoDaven has the rows;
   only you have "Mincha at 13:30 — confirmed 8 minutes ago by 3 people." Do not ship G7 without
   G8 or you have merely built a worse GoDaven.
6. **G10** — raise the ad-hoc horizon past +1 h. Cheap, and it directly removes the RustyBrick
   constraint from the primary path.

### Phase 2 — Make one attendance turn into two (the loop)
7. **G3 + G4 + G5** — public share page, working universal/app links, real share content. In that
   order: the page must exist before the deep link is worth enabling. Today every WhatsApp share
   is a wasted impression; this is your only compounding channel.
8. **G13 → G12** — finish push, then ship "needs 2 more." Presence + confirmation are already
   built; push is the missing wire that converts a 7/10 into a 10/10.
9. **G14** — instrument with a city dimension and persist daily metrics **before** Phase 1 traffic
   arrives, so Phase 1 is measurable rather than a vibe.

### Phase 3 — Retention (do this once density is non-zero, not before)
10. **G11** — mourner mode. It is your best retention mechanic (2–3 opens/day for 11 months) but
    it is *retention*, and retention of zero users is zero. It needs venues (G6) to have somewhere
    to send the avel.
11. **G9** — recurrence, for offices/campuses. Real supply, but only compelling once the map
    isn't empty.
12. **G17 + G18** — nusach filtering and a genuine RTL pass. Both are one layer from done and both
    are cheap; they matter the moment you market to Sephardic/Israeli users.
13. **G15** — timezone correctness. Bugs are real but only bite cross-timezone users, who are a
    later cohort than "city #1."

### Phase 4 — Scale
14. **G19** — Shabbat mode. **G20** — gabbai tooling.

### 🚫 Explicitly do NOT build yet
- **Chat.** Already built (`chat.tsx`, `chats.tsx`, `chat_threads/messages/members`, moderation).
  Do not extend it. It is a retention feature for communities that do not exist yet, and it is
  your largest App Store moderation liability per unit of value.
- **Travel / stay / flight / traveler / travel-city** (`travel.tsx` 465 lines, `create-stay.tsx`,
  `flight.tsx`, `traveler.tsx`, `travel-city.$cityKey.tsx`, `travel_presence`, city chat threads).
  This is a *second* cold-start problem stacked on the first, and it needs density in **two**
  cities to produce a single match. Freeze it. Do not fix its bugs.
- **`/siddur`, `/backup`, `/trust`, `/maps-test`, `/synagogue`, `/kaddish`, `/shabbat`** — the last
  four are already `LEGACY_SCREENS_ENABLED = false` mockups (`feature-flags.ts:5`). Leave them off.
  Do not "polish" a mock; either rebuild it against real data (G11/G19/G20) or delete it.
- **Android.** Ship iOS first. Android needs an FCM service account, verified app links, and a
  second store review — for a market you have not proven. `notify-nearby-minyan:10-11` already
  admits Android push is unwired; leave it.
- **Denominational/egalitarian counting (item 15).** Launch Orthodox-first. Adding it now
  multiplies every counting, nusach and filtering decision by a factor you do not need in city #1.
- **Second city.** Do not seed city #2 until city #1 shows repeat weekday confirmations. That is
  exactly how RustyBrick died — spread thin across every city, dense in none.

---

## 6. Open questions — decisions only you can make

1. **Which single city?** Everything in Phase 1 is scoped to one metro. The audit cannot pick it.
   The Francophone thesis argues Sarcelles/Créteil/Paris 19e or a French community in Jerusalem;
   the reliability thesis argues wherever *you* can personally verify 200 schedules weekly.
2. **How do you get the base data legally?** Scrape GoDaven (legal + relationship risk), partner
   with it, license from a local federation, or hand-enter city #1. This choice determines whether
   G7 is 3 days or 3 months, and it gates the entire roadmap.
3. **Is a seeded listing shown as "MinyanNow-verified" or "imported, unverified"?** This is your
   trust posture. Marking imported data as verified would destroy the one thing you have over
   GoDaven the first time it is wrong.
4. **Does the public share page (G3) expose exact location to logged-out visitors?** I recommend
   coarse only (neighbourhood + distance band), but that weakens the "300 m away" hook. Product
   call, with a privacy consequence for a minority user base.
5. **Guest accounts.** They currently exist (`auth.tsx:27`) and make the RLS over-share free to
   exploit. Keep guests and accept weaker enumeration guarantees, or require Apple/Google before
   any minyan read?
6. **`density_min_threshold` is live at `1`** (was `3`, `20260707191500:20`). Publishing a zone
   with a single person is de-anonymising at 1 km. Was that a launch-time decision or drift?
   Restoring `3` will make an empty city look emptier — which is the honest signal.
7. **Shabbat philosophy.** Pre-Shabbat planning digest only (safe, limited), or a
   scheduled-minyan model where Shabbat minyanim need no in-Shabbat interaction at all (better
   product, halachically more opinionated)? This shapes G19 and the venue schema.
8. **Kaddish visibility.** Does "someone needs Kaddish here" appear to strangers? It is your
   strongest call-to-action and simultaneously the most sensitive disclosure in the app.
9. **Apple Developer enrolment status.** G4 (deep links) and G13 (push) are both blocked on it;
   commit `b15372d` unlinked the push entitlement pending enrolment. Timeline?
10. **Do you delete the frozen surface area or keep it?** `travel*`, `chat*`, `flight`, `siddur`,
    `backup`, `trust`, `synagogue`, `kaddish`, `shabbat`, `maps-test` are roughly a third of the
    route tree. Keeping them costs maintenance and App Store review surface; deleting them is
    irreversible without git archaeology.

---

## Top 3 recommendations

1. **Revoke `anon`/`authenticated` EXECUTE on `nearby_push_recipients` today, then close the
   `minyanim` / `minyan_participants` / `profiles` world-read.** Anyone holding the app's
   publishable key can currently harvest user IDs, approximate locations and APNs device tokens
   for your entire active user base. Nothing else on this list matters if that ships.
2. **Build the base map and seed exactly one city — then make it confirmable.** `venues` +
   `venue_schedules` + ~200 real imported schedules + a one-tap "is this happening?" that stamps
   `last_verified_at`. You have built the live layer and skipped the map; that is precisely the
   configuration that killed Minyan Now in 2014. Freeze travel, chat and every legacy mock until
   a cold-start user in city #1 sees a full screen.
3. **Repair the WhatsApp loop end to end: public web view → enabled universal links → per-minyan
   OG card.** Right now the share button produces a link that shows an uninstalled recipient the
   words "minyan not found." That is your only compounding growth channel and all four of its
   links are broken. It is roughly one week of work and it is the difference between linear and
   exponential.

Not implementing anything. Standing by.
