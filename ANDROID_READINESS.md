# Android Readiness — MinyanNow

## Capacitor config (already set)

- `appId`: `com.raphaelkalfon.minyannow` (= Android `applicationId`)
- `appName`: `MinyanNow`
- `android.backgroundColor`: `#ffffff`
- `server.url`: **not set** — the app loads `dist-mobile/` from disk (true native app)

## Package name & versioning

- `applicationId` in `android/app/build.gradle`: `com.raphaelkalfon.minyannow`
- `versionCode`: integer, increment every upload
- `versionName`: human-readable string (e.g. `1.0.0`)

## Target SDK

- `compileSdk` and `targetSdk`: **34** or higher (Play Store requirement as of Aug 2024+)
- `minSdk`: 23 (Capacitor default)

## `AndroidManifest.xml` permissions

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- No background location, no IDFA equivalent, no SMS, no contacts -->
```

## App Links (optional, future)

To make share URLs open the app on Android:

1. Add intent filter to `MainActivity`:
   ```xml
   <intent-filter android:autoVerify="true">
     <action android:name="android.intent.action.VIEW" />
     <category android:name="android.intent.category.DEFAULT" />
     <category android:name="android.intent.category.BROWSABLE" />
     <data android:scheme="https" android:host="minyan-now-18mb.vercel.app" />
   </intent-filter>
   ```
2. Host `/.well-known/assetlinks.json` on the published domain with the SHA-256 fingerprint of the signing key.

Not required for v1 submission.

## Adaptive icon

Provide:

- `mipmap-anydpi-v26/ic_launcher.xml` — foreground + background layers
- Foreground SVG: 108×108 dp, safe area 66 dp diameter (Android crops the corners)
- Background: solid color or simple gradient (use `#FFFFFF` or the brand color)

Place generated icons under `android/app/src/main/res/mipmap-*`. Run
`npm run cap:sync` after replacing them.

## Play Store metadata

- Privacy policy URL: `https://minyan-now-18mb.vercel.app/privacy`
- Support email: `support@minyannowapp.com`
- Support website: `https://minyan-now-18mb.vercel.app/support`
- Account deletion URL (Play requires this): `https://minyan-now-18mb.vercel.app/settings` (Delete Account in-app)
- Category: Lifestyle
- Content rating: Everyone

## Data Safety form (Play Console)

| Data type                | Collected                         | Shared                                       | Optional | Purpose                                  |
| ------------------------ | --------------------------------- | -------------------------------------------- | -------- | ---------------------------------------- |
| Email                    | Yes                               | No                                           | No       | Account management                       |
| User ID                  | Yes                               | No                                           | No       | Account management                       |
| Approximate location     | Yes                               | No                                           | Yes      | App functionality (find nearby minyanim) |
| Precise location         | Yes (foreground only)             | No                                           | Yes      | App functionality                        |
| App interactions         | Yes (only if GA4/Clarity enabled) | Yes (to Google Analytics, Microsoft Clarity) | Yes      | Analytics                                |
| Diagnostics / crash logs | Yes                               | Yes (Google)                                 | Yes      | Analytics                                |

All data is encrypted in transit (HTTPS). Users can request deletion in-app
via Settings → Delete Account.

## Pre-submission checklist

- [ ] Run `npm run cap:sync` after every web build
- [ ] Generate signed AAB (`./gradlew bundleRelease`)
- [ ] Test on a real Android device (location, notifications post-13, share intent, Google Maps deep link)
- [ ] 512×512 icon (no transparency)
- [ ] Feature graphic 1024×500
- [ ] Phone screenshots × 2-8 (1080×1920 or similar)
- [ ] Short description (80 chars) + full description (4000 chars)
- [ ] Data Safety form completed (see table above)
- [ ] Privacy policy URL accessible
- [ ] Account deletion URL accessible
