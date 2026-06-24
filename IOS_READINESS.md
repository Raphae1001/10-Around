# iOS Readiness — MinyanNow

## Capacitor config (already set)

`capacitor.config.ts`:
- `appId`: `app.lovable.minyannow`
- `appName`: `MinyanNow`
- `server.url`: `https://global-minyan-connect.lovable.app`
- `server.allowNavigation`: locked to the published domain
- `ios.limitsNavigationsToAppBoundDomains`: `true` (required by App Review)
- `ios.contentInset`: `always`

## Bundle identifier & versioning

- Bundle ID in Xcode: `app.lovable.minyannow`
- Marketing version (CFBundleShortVersionString): start at `1.0.0`, bump on release
- Build number (CFBundleVersion): integer, increment every TestFlight build (auto-increment in Xcode build phase recommended)

## Required `Info.plist` keys

Add these strings exactly in `ios/App/App/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>MinyanNow uses your location to help discover nearby Minyanim and improve community participation.</string>

<key>NSCalendarsUsageDescription</key>
<string>MinyanNow can add upcoming Minyan times to your calendar so you don't miss tefilla.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>MinyanNow can save a Minyan invitation card to your Photos so you can share it.</string>

<!-- Required when Push Notifications capability is enabled (no string needed beyond entitlement) -->
<!-- Sign in with Apple capability is REQUIRED because Google sign-in is offered (App Review 4.8) -->
```

Do NOT add `NSUserTrackingUsageDescription` / `AppTrackingTransparency`: the
GA4 and Microsoft Clarity integration in the web shell does not use the
IDFA. Adding ATT without using it triggers automatic rejection.

## Capabilities to enable in Xcode

1. **Push Notifications** — required because the app registers a device token
2. **Sign in with Apple** — required by App Review 4.8 since Google sign-in is offered
3. **Associated Domains** (only if you wire Universal Links): `applinks:global-minyan-connect.lovable.app`

## Universal Links (optional, future)

If you want share URLs to open the app directly:
1. Add `applinks:global-minyan-connect.lovable.app` under Associated Domains
2. Host `/.well-known/apple-app-site-association` on the published domain with paths covered

Not required for v1 submission.

## App Store Connect metadata

- Privacy policy URL: `https://global-minyan-connect.lovable.app/privacy`
- Support URL: `https://global-minyan-connect.lovable.app/support`
- Account deletion: in-app via Settings → Delete Account (no external URL required, but a public mention exists at `/support`)
- App category: Lifestyle (primary), Reference (secondary)
- Age rating: 4+

## Privacy nutrition label (App Store Connect)

Data linked to user:
- Email address (account)
- Coarse location (app functionality)
- Identifiers — user ID (app functionality)

Data not linked to user (analytics):
- Coarse location, device interaction, performance data (only if GA4 / Clarity enabled)

Tracking: NO. The app does not use the IDFA for tracking across apps and websites.

## Pre-submission checklist

- [ ] Run `bunx cap sync ios` after every web build
- [ ] Test on a real iPhone (location prompt, push prompt, share sheet, Google Maps handoff)
- [ ] Verify Sign in with Apple flow works end-to-end
- [ ] Test account deletion (Settings → Delete Account) and confirm auth session is cleared
- [ ] 1024×1024 marketing icon (no transparency, no rounded corners — Apple adds them)
- [ ] 6.7" iPhone screenshots (1290×2796) × 3+
- [ ] 6.1" iPhone screenshots (1179×2556) × 3+ (optional, recommended)
- [ ] App description, keywords, promotional text in English (other locales optional for v1)
