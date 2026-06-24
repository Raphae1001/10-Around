## Goal

Make Share and Navigate always open in a real external app/tab — never inside the Lovable preview iframe / Capacitor webview — and give every Minyan its own shareable URL.

## Root cause

The buttons themselves don't use `<iframe>` in our code. The `ERR_BLOCKED_BY_RESPONSE` comes from the app running inside the Lovable preview iframe: calls like `window.location.href = "https://maps.google.com/..."` and even some `window.open(...)` end up navigating the iframe, and WhatsApp / Google Maps refuse to be framed.

The current `openDirections` is the main offender — it sets `window.location.href` for iOS/Android branches. `shareAny` also falls back to `window.open(wa.me)` which can be blocked by the iframe sandbox.

## Fix — Share

Rewrite `src/lib/share.ts`:

1. **Capacitor native share** first (when `Capacitor.isNativePlatform()`), via `@capacitor/share`.
2. **`navigator.share(...)`** when available (mobile browsers, Safari, modern Chrome desktop).
3. **WhatsApp fallback** — `wa.me/?text=...` on desktop, `whatsapp://send?text=...` on mobile.
4. **Final fallback** — copy to clipboard + toast showing the copied link.

All external opens go through one helper `openExternal(url)` that:
- Creates a transient `<a href target="_blank" rel="noopener noreferrer">`, appends to `document.body`, `.click()`s, then removes it. This is the only reliable way to escape the preview iframe under a user gesture.
- For custom-scheme URLs (`whatsapp://`) uses `window.top.location.href` with a fallback timer.
- Never touches `api.whatsapp.com`.

Share payload built from minyan: title, date, time, address, "need N more", deep link `https://global-minyan-connect.lovable.app/minyan/{id}` (uses published origin, not preview origin).

## Fix — Navigate

Rewrite `src/lib/directions.ts`:

- If `lat,lng`: `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`
- Else address: `https://www.google.com/maps/search/?api=1&query=ENCODED`
- Open via the same `openExternal()` helper (anchor + `_blank` + `noopener,noreferrer`).
- Remove all `window.location.href = ...` and custom-scheme attempts (`comgooglemaps://`, `geo:`, `maps://`) — Google Maps universal links already hand off to the native app on iOS/Android when installed.

## Deep links per Minyan

Today the route is `/minyan?id=...`. Add a true path-param route:

- Create `src/routes/minyan.$id.tsx` (URL `/minyan/{id}`) that reads `id` from `Route.useParams()` and renders the same `Details` component (extracted/shared with `minyan.tsx`).
- Keep the old `/minyan?id=...` working as a redirect to `/minyan/{id}` for back-compat.
- Share links always use `https://global-minyan-connect.lovable.app/minyan/{id}`.

## Cleanup

- Update `src/routes/minyan.tsx`, `src/routes/home.tsx`, `src/routes/map.tsx`, `src/routes/travel-city.$cityKey.tsx`, `src/routes/maps-test.tsx` to use the new helpers (signatures stay the same: `openDirections(lat,lng,label?)`, `shareAny({title,text,url})`).
- Keep `maps-test.tsx` as a diagnostic page but simplify it to show only the two canonical URLs and an "Open external" button using the new helper.

## Verification

- Run the dev preview in Playwright headless and confirm clicking Share / Navigate triggers a new top-level window (`page.expect_popup()`) with the expected URL — no `ERR_BLOCKED_BY_RESPONSE`.
- Open `/minyan/{realId}` directly and confirm the details render.

## Out of scope

- Capacitor build config / store submission (the helpers are compatible; actual native build is a separate task).
- Phone-number-specific WhatsApp share (we share to "any contact", per spec).
