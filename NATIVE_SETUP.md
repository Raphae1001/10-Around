# MinyanNow — Native (iOS + Android) Setup

This document covers everything needed to generate, build, and ship the
native iOS and Android shells of MinyanNow with Capacitor.

The `ios/` and `android/` folders are **not** committed because they
must be generated locally on a machine with Xcode (macOS) and/or
Android Studio. Capacitor regenerates them deterministically from
`capacitor.config.ts`.

---

## 1. Prerequisites

| Tool                 | Min version | Used for                |
| -------------------- | ----------- | ----------------------- |
| Node.js              | 20.x        | Capacitor CLI           |
| Bun                  | 1.3+        | Package install / build |
| Xcode                | 15+         | iOS build / archive     |
| CocoaPods            | 1.15+       | iOS native deps         |
| Android Studio       | Hedgehog+   | Android build           |
| JDK                  | 17          | Android Gradle 8        |
| Apple Developer acct | paid        | App Store distribution  |
| Google Play Console  | paid        | Play Store distribution |

---

## 2. One-time native project generation

Run from the project root:

```bash
bun install
bun run build           # populates dist/ — required by `cap add`
bunx cap add ios
bunx cap add android
bunx cap sync
```

This creates `ios/App/` and `android/`. Re-run `bunx cap sync` after any
plugin install or `capacitor.config.ts` change.

---

## 3. Installed Capacitor plugins

| Plugin                          | Purpose                          |
| ------------------------------- | -------------------------------- |
| `@capacitor/core` + `cli`       | Runtime + tooling                |
| `@capacitor/ios`                | iOS platform                     |
| `@capacitor/android`            | Android platform                 |
| `@capacitor/app`                | Deep-link / app-state events     |
| `@capacitor/browser`            | In-app browser (OAuth fallback)  |
| `@capacitor/geolocation`        | GPS for nearby minyanim          |
| `@capacitor/push-notifications` | APNs / FCM                       |
| `@capacitor/share`              | Native share sheet (WhatsApp …)  |
| `@capacitor/haptics`            | Touch feedback                   |
| `@capacitor/status-bar`         | Status bar styling               |
| `@capacitor/splash-screen`      | Launch screen                    |
| `@capacitor/keyboard`           | Keyboard resize behavior         |
| `@capacitor/network`            | Offline detection                |
| `@capacitor/preferences`        | Native key/value store           |

---

## 4. iOS configuration

### 4.1 `ios/App/App/Info.plist`

Add (or merge):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>MinyanNow uses your location to find nearby minyanim.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>MinyanNow uses your location to find nearby minyanim.</string>
<key>NSCalendarsUsageDescription</key>
<string>Add minyan times to your calendar.</string>
<key>NSContactsUsageDescription</key>
<string>Share minyanim with your contacts.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Save shared minyan flyers.</string>

<!-- Custom URL scheme (OAuth callbacks, deep links) -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>app.lovable.minyannow</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>minyannow</string>
    </array>
  </dict>
</array>

<!-- External apps we open via URL -->
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>whatsapp</string>
  <string>tel</string>
  <string>mailto</string>
  <string>comgooglemaps</string>
  <string>waze</string>
</array>
```

### 4.2 Universal Links (Associated Domains)

In Xcode → Target **App** → Signing & Capabilities → **+ Capability →
Associated Domains**, add:

```
applinks:global-minyan-connect.lovable.app
```

Apple fetches `https://global-minyan-connect.lovable.app/.well-known/apple-app-site-association`
(already served as `public/.well-known/apple-app-site-association`).
Update the `appID` (`TEAMID.app.lovable.minyannow`) once you have your
Apple Team ID.

### 4.3 Capabilities to enable in Xcode

- Push Notifications
- Background Modes → Remote notifications
- Sign in with Apple (only if you ship Apple auth)
- Associated Domains (see 4.2)

### 4.4 Build & archive

```bash
bun run build
bunx cap sync ios
bunx cap open ios
```

In Xcode: choose **Any iOS Device (arm64)** → Product → **Archive** →
Distribute App → App Store Connect → Upload.

See `TESTFLIGHT_GUIDE.md` for the full TestFlight flow.

---

## 5. Android configuration

### 5.1 `android/app/src/main/AndroidManifest.xml`

Inside `<application>`:

```xml
<activity
  android:name=".MainActivity"
  android:launchMode="singleTask"
  android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.MAIN" />
    <category android:name="android.intent.category.LAUNCHER" />
  </intent-filter>

  <!-- Custom-scheme deep links -->
  <intent-filter android:autoVerify="false">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="minyannow" />
  </intent-filter>

  <!-- App Links (verified https deep links) -->
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https"
          android:host="global-minyan-connect.lovable.app" />
  </intent-filter>
</activity>
```

Inside `<manifest>` (top level):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<queries>
  <package android:name="com.whatsapp" />
  <package android:name="com.google.android.apps.maps" />
  <package android:name="com.waze" />
  <intent>
    <action android:name="android.intent.action.SENDTO" />
    <data android:scheme="mailto" />
  </intent>
  <intent>
    <action android:name="android.intent.action.DIAL" />
    <data android:scheme="tel" />
  </intent>
</queries>
```

### 5.2 Android App Links verification

Host the Digital Asset Links file at
`https://global-minyan-connect.lovable.app/.well-known/assetlinks.json`
(template is in `public/.well-known/assetlinks.json` — update
`sha256_cert_fingerprints` with your upload + Play app-signing key
fingerprints).

Verify with:

```bash
adb shell pm verify-app-links --re-verify app.lovable.minyannow
adb shell pm get-app-links app.lovable.minyannow
```

### 5.3 Firebase Cloud Messaging

For push:

1. Create a Firebase project, add an Android app with package
   `app.lovable.minyannow`.
2. Download `google-services.json` → drop into `android/app/`.
3. `android/build.gradle` already wires `com.google.gms:google-services`
   via Capacitor's plugin once you run `bunx cap sync android`.

### 5.4 Build

```bash
bun run build
bunx cap sync android
bunx cap open android
```

In Android Studio: **Build → Generate Signed App Bundle** → AAB → upload
to Play Console.

---

## 6. Feature compatibility audit

| Feature              | Web         | iOS                                       | Android                                |
| -------------------- | ----------- | ----------------------------------------- | -------------------------------------- |
| Supabase auth (mail) | ✅          | ✅                                        | ✅                                     |
| Google OAuth         | ✅          | ✅ via in-app browser → `minyannow://`    | ✅ via Chrome Custom Tab               |
| Google Maps          | ✅ JS SDK   | ✅ (web SDK inside WebView)               | ✅                                     |
| WhatsApp share       | ✅ Web Share | ✅ `@capacitor/share` → native sheet      | ✅ `@capacitor/share` → native sheet   |
| Geolocation          | ✅          | ✅ requires `NSLocation*UsageDescription` | ✅ requires runtime permission prompt  |
| Push notifications   | ⚠️ web push | ✅ APNs (capability + cert)               | ✅ FCM (`google-services.json`)        |
| Deep links           | n/a         | ✅ Universal Links + `minyannow://`       | ✅ App Links + `minyannow://`          |
| Calendar `.ics`      | ✅ download | ✅ opens in Calendar.app                  | ✅ opens in Calendar app               |

No source changes are needed — `src/lib/native.ts` already detects
`Capacitor.isNativePlatform()` and routes to the right API.

---

## 7. After every web change

```bash
bun run build
bunx cap sync
```

UI/JS-only changes do NOT require a new App Store / Play Store
submission because the WebView loads the published Lovable URL.
Resubmit only when:

- adding a Capacitor plugin
- changing native permissions or capabilities
- bumping app version / icons / splash

---

## 8. Manual steps (cannot be automated here)

1. Run `bunx cap add ios` and `bunx cap add android` on a developer
   machine (requires Xcode / Android Studio).
2. Set the Apple Team ID inside `public/.well-known/apple-app-site-association`.
3. Generate Android signing keys and fill
   `public/.well-known/assetlinks.json` with the SHA-256 fingerprints.
4. Add `google-services.json` (Android) and APNs key (iOS) for push.
5. Generate app icons + splash with
   `bunx @capacitor/assets generate --iconBackgroundColor "#ffffff"`
   after placing a 1024×1024 `assets/icon.png` and a 2732×2732
   `assets/splash.png`.
6. Configure Supabase Auth redirect URLs to include
   `minyannow://auth/callback` and
   `https://global-minyan-connect.lovable.app/auth/callback`.
