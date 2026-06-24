## Fix Abroad access, chat delivery & sharing

### 1. Abroad visible on Home + access without "not registered" error
- **Home (`src/routes/home.tsx`)**: add a "Your destinations" section above "Nearby" that loads `my_travel_cities()` and renders a small card per city (city name, dates, peer count) linking to `/travel-city/$cityKey`. Also show it in the empty state so the user always has a way in.
- **Travel city page (`src/routes/travel-city.$cityKey.tsx`)**: stop bouncing back to `/chats` with "You're not registered". If the user has no `travel_presence` row for this city, still load the page using a default window (today → today+30d), let them see who's there, and offer a "Register my dates" CTA that inserts a row and reloads.
- **DB (`list_city_peers`)**: drop the `RAISE EXCEPTION 'not a traveler…'` precondition so any authenticated user can read peers in a city. Privacy stays scoped to authenticated users; identities are only exposed inside the city page (no longer a public feed).
- **Auto-join chat for travelers**: ensure `on_travel_presence_chat` also adds the creator (today's trigger inserts all current presences — keep, plus an explicit insert of `NEW.user_id`).

### 2. Chat group: delivery to all members + notifications
- **Verify RLS**: confirm `chat_messages` INSERT policy allows any member of the thread, and SELECT policy allows members. If missing, add `is_chat_member(thread_id)`-based policies so realtime broadcasts reach every member.
- **Realtime**: `chat_messages` must be in `supabase_realtime` publication; add it if missing. Each chat page already subscribes per `thread_id` — once RLS is correct, every member receives messages live.
- **In-app notifications**: on `/chats`, subscribe globally to `chat_messages` for the user's threads, increment an unread badge per thread, and surface a toast when a new message arrives in a thread not currently open. Show unread dot on thread rows + bottom-nav Chats icon.
- **Push notifications (optional, mobile)**: out of scope for this round unless the user confirms — true OS push needs an edge function + APNs/FCM keys. Plan only the in-app/web-notification path now; ask before adding native push.

### 3. Google Maps directions + WhatsApp share
- **Directions**: `openDirections` already opens Google Maps deep-link. Use the Google Maps connector to pre-resolve a place when we only have an address (no lat/lng), so the destination is exact. Add a small helper `directionsUrl(lat,lng,label)` reused everywhere; on native (Capacitor), open via `App.openUrl` for proper app handoff.
- **WhatsApp share**: keep `wa.me/?text=…` (already used on minyan page). Add the same WhatsApp share button on:
  - the travel-city page (share "Join me in {city} between {dates}" + link),
  - the post-join confirmation dialog on home,
  - the share screen for travel cities.
- Build all links with the canonical published origin (fallback to `window.location.origin`) so links work when opened from WhatsApp.

### Technical notes
- Migration: alter `list_city_peers` to remove the registration check; ensure `ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;` (idempotent guard); review `chat_messages` policies.
- New helper: `src/lib/share.ts` with `shareWhatsApp({text,url})` + `shareNative(...)` wrapper.
- Home query batched with existing effects; `my_travel_cities` already returns `thread_id` + `peer_count`.
- No schema changes beyond the policy/publication tweaks.

### Out of scope (ask before doing)
- Native OS push notifications (APNs/FCM) — needs an edge function + secrets.
