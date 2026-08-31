# TestFlight & Play Internal Testing — MinyanNow

## iOS — TestFlight

### 1. Build & archive

```bash
npm install
npm run cap:sync
npm run cap:ios
```

In Xcode:

1. Select target **App** → Signing & Capabilities → set Team, verify Bundle ID `com.raphaelkalfon.minyannow`
2. Add capability: **Push Notifications** (anonymous auth — no Sign in with Apple required)
3. `Info.plist` already includes location usage string (see `IOS_READINESS.md`)
4. Top bar → device selector → **Any iOS Device (arm64)**
5. Product → Archive
6. Wait for Organizer to open

### 2. Upload to App Store Connect

In Organizer:

1. Select the new archive → **Distribute App**
2. Choose **App Store Connect** → **Upload**
3. Automatic signing, include bitcode = NO (no longer supported), upload symbols = YES
4. Wait ~5-15 min for the build to appear in App Store Connect → TestFlight tab
5. Resolve any "Missing Compliance" prompts (ITSAppUsesNonExemptEncryption = NO — only standard HTTPS)

### 3. TestFlight internal testers (up to 100, no review needed)

1. App Store Connect → MinyanNow → TestFlight → Internal Testing
2. Create a group → add Apple IDs of team members
3. Assign the new build → testers receive an email + can install via TestFlight app
4. Iterate quickly: each Xcode upload appears within minutes

### 4. TestFlight external testers (up to 10,000, Apple beta review required)

1. TestFlight → External Testing → Add Group
2. Add testers (email or public link)
3. Fill in **Test Information**: what to test, contact email, beta description, privacy policy URL (`/privacy`)
4. Submit build for beta review (usually 24h)
5. Once approved, external testers can install

### 5. Submit for App Store review

1. App Store Connect → App Store → "+ Version" → 1.0.0
2. Fill in: description, keywords, support URL (`/support`), marketing URL, screenshots, app icon
3. Privacy → Data Collection: declare per `STORE_COMPLIANCE.md`
4. Age rating questionnaire
5. Pricing: Free
6. Submit for Review

---

## Android — Internal Testing

### 1. Build signed AAB

```bash
bun install
bun run build
bunx cap sync android
bunx cap open android
```

In Android Studio:

1. Build → Generate Signed Bundle / APK → Android App Bundle
2. Create or select a keystore (back it up — Play Store apps cannot rotate keystore without Play App Signing migration)
3. Variant: `release`
4. Output: `android/app/release/app-release.aab`

### 2. Play Console — first-time setup

1. Create app in Play Console → App name "MinyanNow", language English
2. Complete **App content**:
   - Privacy policy URL: `https://minyan-now-18mb.vercel.app/privacy`
   - App access: provide test credentials if sign-in required
   - Ads: No
   - Content rating questionnaire
   - Target audience: 13+
   - **Data Safety form** — answers in `ANDROID_READINESS.md`
   - Government apps: No
   - Financial features: No
   - Health: No
3. Pricing & distribution: Free, select countries

### 3. Internal testing track

1. Release → Testing → Internal testing → Create new release
2. Upload AAB
3. Add testers (list of email addresses, up to 100, or import a Google Group)
4. Save → Review release → Start rollout to Internal testing
5. Testers get an opt-in link → install from Play Store

### 4. Closed / open testing

1. Closed testing: same flow as Internal, supports more testers, requires app review (~2-7 days first time)
2. Open testing: anyone can join via a public link

### 5. Production

1. Release → Production → Create new release
2. Upload AAB (or promote from closed testing)
3. Provide release notes
4. Roll out to production (staged rollout recommended: 10% → 50% → 100%)

---

## Post-submission tips

- **iOS rejections**: most common are missing permission strings, missing Sign in with Apple, or non-functional placeholder content. All addressed in this codebase.
- **Android rejections**: most common are incomplete Data Safety form and missing target SDK 34+.
- **Web updates after submission**: the app is a true native bundle (`dist-mobile/` built into the binary, no `server.url`) — any web/UI change requires a new `npm run build:mobile` + `cap sync` + Xcode archive + resubmission, not just a redeploy. Native plugin additions or permission changes also require a new submission.
