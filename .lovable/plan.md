## What you're seeing on the screenshots

**Google Maps & WhatsApp "blocked" pages** — these are NOT bugs in the app. The error `ERR_BLOCKED_BY_RESPONSE` means **your network / browser / extension is blocking those domains** (`www.google.com` and `api.whatsapp.com`). The URLs the app generates are 100% correct (you can see the parameters are valid in your address bar). Same links open normally on a phone or any unrestricted network.

### What to check on your side (nothing to send me)
1. Try the same link on your **phone (mobile data, not WiFi)** — it should open Google Maps / WhatsApp directly.
2. If the phone works but the laptop doesn't → it's your **WiFi / company network / DNS / parental control / ad-blocker / privacy extension** blocking Google + WhatsApp domains.
3. Common culprits to disable and retry: **uBlock Origin, AdGuard, Privacy Badger, Brave Shields, NextDNS, Pi-hole, school/office firewall, VPN with strict filtering**.
4. If you only need it to work for users on normal networks → **it already works**. No code fix possible from our side; we can't bypass a network-level block.

## What I will change in the app (fixes to your actual report)

### 1. Cancel button on the Home "Your destinations" cards
Right now you can only cancel from inside the city page. I'll add a small **trash icon** on each destination card on `/home` (next to the chat icon) that prompts for confirmation, deletes your `travel_presence` for that city, and refreshes the list.

### 2. WhatsApp share — switch to a more compatible URL
- Replace `https://api.whatsapp.com/send?text=...` and `https://wa.me/?text=...` with the **native share sheet first** (`navigator.share` on mobile = opens the OS share menu including WhatsApp, Messages, Telegram, Mail…), and fall back to `wa.me` only on desktop where native share is unavailable.
- This avoids the `api.whatsapp.com` block you saw and gives users every share target their phone supports.

### 3. Google Maps directions — add a safer fallback
- Keep the universal `google.com/maps/dir/?...` URL (works for 99% of users).
- On mobile, attempt the **native scheme** first (`comgooglemaps://` on iOS if installed, otherwise `geo:` on Android, otherwise Apple Maps `maps://`), so users never hit `www.google.com` in their browser at all.
- Still nothing we can do if the user's network blocks Google entirely — but most users will now bypass the browser hit.

## Files to edit
- `src/routes/home.tsx` — add trash icon + cancel handler on each destination card.
- `src/lib/share.ts` — prefer native share, wa.me fallback only on desktop.
- `src/lib/directions.ts` — try native maps scheme on mobile, then universal URL fallback.

## What I need from you
Nothing to send. Just confirm:
- **a)** test one of those blocked links on your phone with mobile data — does it open?
- **b)** should I go ahead with the 3 app changes above?
