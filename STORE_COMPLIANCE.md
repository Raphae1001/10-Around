# Store Compliance Review — MinyanNow

Simulated review against the current Apple App Store Review Guidelines and
Google Play Developer Program Policies (as of 2026).

---

## Apple App Store

### Code-level compliance — PASS

| Guideline | Status | Notes |
|---|---|---|
| 5.1.1(v) Account deletion | ✅ | Settings → Reset this device + Delete Account, hard-deletes via `deleteMyAccount` server fn |
| 4.8 Sign in with Apple parity | ✅ | N/A — MinyanNow uses anonymous-only onboarding (Prénom + Nom). No Google / Apple / email / OAuth offered, so 4.8 does not apply. |
| 4.0 Design — minimum functionality | ✅ | Live minyan creation/joining is non-trivial native functionality |
| 2.1 App completeness | ✅ | All routes load; no placeholder screens |
| 2.3.1 Hidden features | ✅ | No |
| 2.5.4 Multitasking apps | ✅ | No background location, no background audio |
| 5.1.1 Permission strings | ⚠️ | `NSLocationWhenInUseUsageDescription` MUST be in Info.plist before submission (see IOS_READINESS.md) |
| 5.1.2 Data collection minimization | ✅ | Only first/last name + foreground location collected. No email, no password. |
| 5.4 VPN apps | N/A | |
| 1.4.1 Physical harm | ✅ | App provides religious functionality, not medical/safety guidance |

### Known rejection risks

1. **Missing permission strings.** Without `NSLocationWhenInUseUsageDescription`, the app crashes when requesting location. Use the strings in IOS_READINESS.md.
2. **Privacy nutrition label.** Declare: first/last name (linked to user), coarse/precise location (foreground only), optional analytics. No email or auth credentials.
3. **`limitsNavigationsToAppBoundDomains: true`** is already set — required when loading remote web content in 2026+. ✅
4. **No `server.url` in `capacitor.config.ts`.** The app loads `dist-mobile/` from disk so it is a true native app, not a webview wrapper (guideline 4.2). Do not re-add `server.url`.

---

## Google Play

### Code-level compliance — PASS

| Policy | Status | Notes |
|---|---|---|
| Account deletion | ✅ | In-app + documented URL on `/support` |
| Target API level (Aug 2024+) | ⚠️ | Verify `targetSdk = 34` in `android/app/build.gradle` |
| Data Safety form | ⚠️ | Must complete in Play Console (table in ANDROID_READINESS.md) |
| Privacy policy URL | ✅ | `/privacy` route exists and is publicly accessible |
| Permissions justification | ✅ | Only requests what app needs (location, notifications, internet) |
| Sensitive permissions | N/A | No SMS, contacts, accessibility, or all-files-access |
| Foreground location | ✅ | Used only while app is in foreground |
| Background location | ✅ | Not requested |
| Notification permission (API 33+) | ✅ | Capacitor Push plugin requests at runtime |

### Known requirements before submission

1. Complete the Data Safety form in Play Console.
2. Provide a publicly accessible account-deletion URL (already done — `/support`).
3. Generate signed AAB and upload to Internal Testing track first.
4. Provide content rating questionnaire answers (no violence, no profanity, no user-to-user uncontrolled comms — chat is scoped to participants of a minyan/city, with moderation contact).

---

## Required public URLs (both stores)

| URL | Status |
|---|---|
| `https://global-minyan-connect.lovable.app/privacy` | ✅ Live |
| `https://global-minyan-connect.lovable.app/terms` | ✅ Live (added this pass) |
| `https://global-minyan-connect.lovable.app/support` | ✅ Live (added this pass) |

---

## Marketing assets checklist

### iOS
- [ ] 1024×1024 App Store icon (PNG, no alpha, no rounded corners)
- [ ] 6.7" iPhone screenshots (1290×2796) × 3-10
- [ ] 6.1" iPhone screenshots (1179×2556) × 3-10 (optional)
- [ ] 12.9" iPad Pro screenshots (only if iPad supported; recommend marking iPhone-only for v1)
- [ ] App Preview video (15-30s, .mov/.mp4) — optional but boosts conversion
- [ ] Promotional text (170 chars)
- [ ] Description (4000 chars)
- [ ] Keywords (100 chars)

### Android
- [ ] 512×512 app icon (PNG, no alpha)
- [ ] Feature graphic 1024×500 (JPG/PNG)
- [ ] Phone screenshots × 2-8 (16:9 or 9:16, min 320 px)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Optional: tablet screenshots, promo video
