# MinyanNow — Native Setup (iOS + Android)

Source of truth for the **Capacitor native shell**. The hosted web app runs on
Vercel (TanStack Start SSR). The native apps load a **bundled SPA** from
`dist-mobile/` — not a remote website.

## Repo layout

| Path | Role |
|------|------|
| `capacitor.config.ts` | `appId: com.minyannow.app`, `webDir: dist-mobile` |
| `vite.mobile.config.ts` | SPA build → `dist-mobile/index.html` |
| `npm run build:mobile` | Rebuild the native web bundle |
| `npm run cap:sync` | Build mobile + `cap sync` (iOS + Android) |
| `public/.well-known/` | Universal Links + Android App Links (served by Vercel) |

**Auth:** anonymous onboarding only (Prénom + Nom). No Google/Apple OAuth in the app.

---

## 1. Supabase Auth — URL Configuration

Dashboard → **Authentication** → **URL Configuration**:

- **Site URL**
  ```
  https://minyan-now-18mb.vercel.app
  ```
- **Redirect URLs** (add each line)
  ```
  https://minyan-now-18mb.vercel.app/**
  https://minyan-now-18mb.vercel.app/auth/callback
  http://localhost:5173/**
  http://localhost:5173/auth/callback
  ```

Project ref: `jyqregdkmufrxyugrxrp` (region ap-northeast-2).

---

## 2. Environment variables

### Vercel (web)
- `VITE_SUPABASE_*`, `SUPABASE_*`
- `VITE_APP_URL=https://minyan-now-18mb.vercel.app`
- `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` (or your GCP key)

### Local `.env`
Copy from `.env.example`. Run `npm run dev` for web, `npm run build:mobile` for native.

Native builds inject `VITE_*` at compile time via `vite.mobile.config.ts`.

---

## 3. Build & sync native

```bash
npm run cap:sync          # build:mobile + cap sync ios + android
npm run cap:ios           # sync + open Xcode
npm run cap:android       # sync + open Android Studio
```

After changing web code, always re-run `cap:sync` before testing in Xcode/Android Studio.

---

## 4. iOS

- Bundle ID: `com.minyannow.app`
- Open `ios/App/App.xcworkspace` in Xcode
- Set your **Team** under Signing & Capabilities
- `Info.plist` includes `NSLocationWhenInUseUsageDescription` (required for map/nearby)

See `IOS_READINESS.md` and `TESTFLIGHT_GUIDE.md`.

### Universal Links (optional)

1. Replace `TEAMID` in `public/.well-known/apple-app-site-association` with your Apple Team ID
2. Redeploy Vercel (file is served from production)
3. Xcode → Associated Domains: `applinks:minyan-now-18mb.vercel.app`

---

## 5. Android

- Application ID: `com.minyannow.app`
- Open `android/` in Android Studio
- Replace SHA-256 fingerprints in `public/.well-known/assetlinks.json` with your upload/signing keys

See `ANDROID_READINESS.md`.

---

## 6. Do NOT regress

- **No `server.url`** in `capacitor.config.ts` (Apple 4.2 — no website wrapper)
- **No root `index.html`** for the SSR build (Capacitor uses `index.mobile.html` → `dist-mobile/index.html`)
- Do not merge `vite.config.ts` and `vite.mobile.config.ts`
