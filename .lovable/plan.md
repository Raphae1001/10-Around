I will fix the native iOS OAuth flow end-to-end so Capacitor receives the Supabase session instead of leaving the user on the hosted website.

Implementation plan:

1. Replace web-style OAuth in native builds
  - Detect `Capacitor.isNativePlatform()` on the auth screen.
  - For Google/Apple in native mode, call Supabase `signInWithOAuth` directly with:
    - `redirectTo: "minyannow://auth/callback"`
    - `skipBrowserRedirect: true`
  - Open the returned OAuth URL with `@capacitor/browser` instead of `window.location` or Lovable’s web OAuth broker.
  - Keep the existing Lovable OAuth flow only for normal hosted web usage.
2. Harden Supabase client for native OAuth
  - Configure Supabase Auth with:
    - `flowType: "pkce"`
    - `detectSessionInUrl: true`
    - `persistSession: true`
    - `autoRefreshToken: true`
  - Add a Capacitor-compatible storage adapter using `@capacitor/preferences` for native builds, falling back to `localStorage` on web.
  - This preserves the PKCE code verifier and final session while Safari/Browser is open.
3. Add Capacitor deep-link callback handling
  - Register `App.addListener("appUrlOpen", ...)` as early as possible in the app shell.
  - Also check `App.getLaunchUrl()` for cold-start callbacks.
  - Handle `minyannow://auth/callback?...` and equivalent universal-link callbacks.
  - Extract `code`, exchange it using `supabase.auth.exchangeCodeForSession(code)`, close the Capacitor Browser, restore the session, and navigate to `/home`.
  - Handle implicit/token fallback if Supabase/provider returns tokens in the hash.
4. Add an `/auth/callback` route
  - Support hosted/universal-link callbacks at `https://global-minyan-connect.lovable.app/auth/callback`.
  - On native, convert that universal link into the same session exchange flow.
  - On web, let Supabase detect/process the URL and redirect to `/home`.
5. Browser close and session restoration
  - Always call `Browser.close()` after a valid OAuth callback on native iOS.
  - Refresh `supabase.auth.getSession()` after exchange so the app immediately sees the authenticated user.
  - Navigate inside the native WebView to `/home`, never leaving the user on the website.
6. Native configuration audit/documentation
  - Verify `@capacitor/app` and `@capacitor/browser` are installed and used.
  - Verify `capacitor.config.ts` keeps `ios.scheme = "minyannow"`.
  - Update `NATIVE_SETUP.md` with exact required iOS files:
    - `Info.plist` URL Type for `minyannow`
    - Associated Domains: `applinks:global-minyan-connect.lovable.app`
    - `AppDelegate.swift` methods forwarding to `ApplicationDelegateProxy.shared` for custom schemes and universal links
  - Update Supabase dashboard instructions:
    - Site URL: hosted Lovable URL
    - Redirect URLs must include `minyannow://auth/callback` and `https://global-minyan-connect.lovable.app/auth/callback`
7. Limitations I will make explicit
  - The generated `ios/` folder is not present in this sandbox, so I cannot directly edit `Info.plist` or `AppDelegate.swift` here.
  - I will provide exact copy/paste native snippets in the repo docs so the generated Xcode project can be configured correctly after `bunx cap sync ios`.  
    
  Before implementing the changes, perform a complete audit of the current OAuth flow and identify every place where web-only behavior is still used.
    Additional requirements:
    1. Do NOT introduce duplicate authentication flows.  
    There must be a single shared authentication service with:
      &nbsp;
      &nbsp;
      - Web flow
      - Native Capacitor flow  
      selected automatically depending on platform.
    2. Do not regress the hosted Lovable web application.  
    Web authentication must continue working exactly as today.
    3. Verify that session persistence works after:
      - App restart
      - App background / foreground
      - Browser interruption
      - Device reboot
    4. Verify OAuth works for:
      - Google
      - Apple
      - Email/password
      - Existing sessions
    5. Verify logout clears:
      - Browser session
      - Supabase session
      - Capacitor Preferences
      - Query cache
    6. Ensure [Browser.open](http://Browser.open)() cannot be opened twice.
    7. Ensure multiple rapid taps on Google Sign-In cannot create multiple OAuth requests.
    8. Ensure appUrlOpen listeners are registered exactly once and cleaned up correctly.
    9. Verify Browser.close() is executed only after successful session restoration.
    10. Verify all authentication flows work in:
    &nbsp;
    - Hosted web
    - PWA
    - iOS Capacitor
    - Android Capacitor
    11. Add Playwright (web) and documented manual native test scenarios covering:
    - Fresh install
    - Existing session
    - Expired session
    - Cancel OAuth
    - Successful OAuth
    - Background during OAuth
    - Deep-link callback
    - Offline during callback
    - App killed before callback
    12. Produce a final report including:
    - Authentication architecture diagram
    - Files modified
    - Security review
    - Regression risks
    - Remaining native configuration outside the repository
    - Final readiness score for:
      - Web
      - PWA
      - iOS
      - Android
    Do not ship the implementation until all regression tests pass.