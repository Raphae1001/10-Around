# MinyanNow — Native Setup (iOS + Android)

This document is the source of truth for the **native shell** configuration.
The web app and database are managed inside Lovable. The items below MUST be
applied **outside the repo** (Xcode, Android Studio, Supabase dashboard,
Apple/Google developer consoles).

The repo already ships:

- `capacitor.config.ts` — `appId: app.lovable.minyannow`, `ios.scheme: minyannow`
- `@capacitor/app`, `@capacitor/browser`, `@capacitor/preferences`
- `src/lib/native-auth.ts` — native OAuth + deep-link bridge
- `src/routes/auth.callback.tsx` — HTTPS callback that re-emits a `minyannow://` deep link
- `public/.well-known/apple-app-site-association`
- `public/.well-known/assetlinks.json`

---

## 1. Supabase Auth — Redirect URLs

In the Lovable backend → Auth → URL Configuration:

- **Site URL**
  ```
  https://global-minyan-connect.lovable.app
  ```
- **Additional Redirect URLs** (one per line)
  ```
  https://global-minyan-connect.lovable.app/auth/callback
  https://global-minyan-connect.lovable.app/auth/callback?native=1
  minyannow://auth/callback
  ```

Without `minyannow://auth/callback` listed, Supabase rejects the native exchange.

---

## 2. iOS — `Info.plist` URL Types

In Xcode → target → **Info** → **URL Types**, add:

- Identifier: `app.lovable.minyannow.oauth`
- URL Schemes: `minyannow`
- Role: `Editor`

Or paste into `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>app.lovable.minyannow.oauth</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>minyannow</string>
    </array>
  </dict>
</array>
```

---

## 3. iOS — Associated Domains (Universal Links — optional but recommended)

In Xcode → **Signing & Capabilities** → **+ Capability** → **Associated Domains**:

```
applinks:global-minyan-connect.lovable.app
```

The matching `apple-app-site-association` file is already served from
`/.well-known/apple-app-site-association`. Replace `TEAMID` in that file with
your real Apple Developer Team ID before submitting to App Review.

---

## 4. iOS — `AppDelegate.swift`

Capacitor's default `AppDelegate.swift` already forwards `application(_:open:options:)`
and `application(_:continue:restorationHandler:)` to `ApplicationDelegateProxy`.
**Do not delete those methods.** If a teammate has stripped them, restore:

```swift
func application(_ app: UIApplication,
                 open url: URL,
                 options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
  return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
}

func application(_ application: UIApplication,
                 continue userActivity: NSUserActivity,
                 restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
  return ApplicationDelegateProxy.shared.application(application,
                                                     continue: userActivity,
                                                     restorationHandler: restorationHandler)
}
```

These methods are what fire the `App.addListener('appUrlOpen', ...)` event our
JS layer subscribes to.

---

## 5. Android — Intent filters

In `android/app/src/main/AndroidManifest.xml`, inside the
`<activity android:name=".MainActivity">` block:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="minyannow" android:host="auth" />
</intent-filter>

<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https"
        android:host="global-minyan-connect.lovable.app"
        android:pathPrefix="/auth/callback" />
</intent-filter>
```

Update `public/.well-known/assetlinks.json` with the real Play Store package
SHA-256 fingerprint before publishing.

---

## 6. Google / Apple OAuth providers

- **Google**: in Lovable backend → Auth → Providers → Google, ensure the
  callback URL shown there is whitelisted as an *Authorized redirect URI* in
  the Google Cloud Console OAuth client.
- **Apple**: in your Apple Developer account, configure Sign in with Apple
  for the Services ID and add the Supabase callback URL listed under the
  provider in the Lovable backend.

The native shell does **not** need its own Google/Apple OAuth client — the
flow always goes Provider → Supabase → `…/auth/callback?native=1` →
`minyannow://auth/callback` → app.

---

## 7. Native OAuth flow (sequence)

```
Tap "Continue with Google"
    │
    ▼
nativeOAuthSignIn("google")           src/lib/native-auth.ts
    │  supabase.auth.signInWithOAuth({ skipBrowserRedirect: true,
    │                                  redirectTo: …/auth/callback?native=1 })
    ▼
Browser.open(authUrl)                 SFSafariViewController / Chrome Custom Tab
    │
    ▼
Google sign-in → Supabase /authorize → 302 to redirectTo
    │
    ▼
/auth/callback?native=1               src/routes/auth.callback.tsx
    │  window.location.replace("minyannow://auth/callback#access_token=…&refresh_token=…")
    ▼
iOS / Android system               opens MinyanNow.app
    │
    ▼
App.addListener("appUrlOpen")         src/lib/native-auth.ts
    │  supabase.auth.setSession({ access_token, refresh_token })
    │  Browser.close()
    │  window.location.assign("/home")
    ▼
Authenticated session active, user inside the native app.
```

---

## 8. Manual native test plan

Run each on a physical device after `bunx cap sync` + Xcode/Android Studio build.

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Fresh install, sign in with Google | Browser opens, closes, user lands on `/home`, session persists |
| 2 | Fresh install, sign in with Apple | Same as above |
| 3 | Existing session, cold launch | Skips `/auth`, opens `/home` |
| 4 | Background app mid-OAuth, return | Browser still on provider, complete → callback fires |
| 5 | Cancel OAuth (close Safari sheet) | App stays on `/auth`, button re-enabled |
| 6 | Sign out | Session cleared, native Preferences purged, returns to `/auth` |
| 7 | Kill app right after provider redirect | Cold-start `getLaunchUrl()` handles the deep link |
| 8 | Airplane mode after callback | Toast / error visible; no infinite spinner |
| 9 | Email/password sign-in | Works without Browser plugin path |
| 10 | OAuth tap spam (3× in 1 s) | Single OAuth request opened |

---

## 9. Readiness checklist

- [x] `flowType` default (implicit) — tokens travel in URL hash, no PKCE storage needed across browsers
- [x] `App.addListener('appUrlOpen')` registered once at app boot
- [x] `App.getLaunchUrl()` checked on cold start
- [x] `Browser.close()` called only after `setSession` succeeds
- [x] Sign-out clears Supabase session + Capacitor Preferences + Query cache
- [x] Web (hosted) flow untouched — still goes through Lovable broker
- [ ] (manual) Supabase Auth Additional Redirect URLs updated
- [ ] (manual) iOS `Info.plist` URL Types entry added
- [ ] (manual) iOS Associated Domains capability enabled
- [ ] (manual) Android intent filters added to `AndroidManifest.xml`
- [ ] (manual) Apple Team ID written into `apple-app-site-association`
- [ ] (manual) Play Store SHA-256 written into `assetlinks.json`
