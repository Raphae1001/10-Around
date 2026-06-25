# iOS Readiness — MinyanNow

The iOS app is a **true native Capacitor app** that loads the bundled web
build from disk (`dist-mobile/`). There is **no `server.url`** in
`capacitor.config.ts` — Apple rejects website wrappers under guideline 4.2.

## Authentication

MinyanNow uses **Supabase Anonymous Authentication only** (Prénom + Nom in
the onboarding flow). There is no Google, Apple, email, password, or any
OAuth provider in the app.

As a direct consequence:
- **Sign in with Apple is NOT required** by App Store Review. Guideline
  4.8 only mandates Apple sign-in when the app offers a third-party social
  login (Google, Facebook, etc.). MinyanNow offers none, so 4.8 does not
  apply.
- There is no `CFBundleURLTypes` entry for `minyannow://` and no OAuth
  callback handler. Do not re-add either — the old OAuth bridge was
  removed intentionally.

## Required `Info.plist` keys

These keys MUST be present in `ios/App/App/Info.plist` or the app will
crash / be rejected:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>MinyanNow uses your location to help you find minyanim near you.</string>
```

Push notifications are registered via `@capacitor/push-notifications` at
onboarding. iOS does NOT require an `Info.plist` usage string for push
permission — the system prompt is automatic.

## Build & sync

```bash
npm run build:mobile     # rebuilds dist-mobile/
npx cap sync ios         # pushes dist-mobile/ + capacitor.config.ts into ios/
```

Open `ios/App/App.xcworkspace` in Xcode, **Product → Clean Build Folder**,
then Run. The Clean is required because Xcode caches the embedded config
aggressively between rebuilds.

## What must NOT regress

- `capacitor.config.ts` must NOT contain `server.url`.
- `Info.plist` must NOT add `CFBundleURLTypes` for a `minyannow` scheme.
- The onboarding flow must remain: First name → Last name → Location →
  Notifications → Continue (anonymous sign-in). No login screen, ever.
