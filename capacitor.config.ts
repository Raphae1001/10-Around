import type { CapacitorConfig } from "@capacitor/cli";

// True native app: Capacitor loads the bundled web build from disk (webDir).
// We do NOT set server.url — that would make the app a website wrapper and
// Apple rejects those under guideline 4.2. The hosted Lovable site is used
// ONLY as the HTTPS OAuth bridge at /auth/callback, never as the app shell.
const OAUTH_BRIDGE_HOST = "global-minyan-connect.lovable.app";

const config: CapacitorConfig = {
  appId: "app.lovable.minyannow",
  appName: "MinyanNow",
  // SPA build for Capacitor lives in `dist-mobile/` (see vite.mobile.config.ts
  // and `npm run build:mobile`). The default `dist/` is the SSR/Nitro output
  // used by the hosted web deployment and does NOT contain an index.html.
  webDir: "dist-mobile",
  // Allow the in-app WebView to briefly navigate to the OAuth bridge during
  // sign-in. Everything else (Google Maps, WhatsApp, tel:, mailto:) opens in
  // the system handler.
  server: {
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: [OAUTH_BRIDGE_HOST],
  },
  ios: {
    // `automatic` lets WKWebView manage safe-area + keyboard insets in a
    // single native pass. Combined with Keyboard.resize="native" below,
    // this prevents the "freeze after first keystroke" bug where the body
    // is re-laid out mid-input and WKWebView loses its input session.
    contentInset: "automatic",
    backgroundColor: "#ffffff",
    limitsNavigationsToAppBoundDomains: true,
    // Custom URL scheme used for OAuth deep-link callback + share intents.
    scheme: "minyannow",
  },
  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DEFAULT",
      backgroundColor: "#ffffff",
    },
    Keyboard: {
      // `native` = iOS adjusts the WebView frame itself; the DOM is never
      // resized mid-typing. `body` and `ionic` mutate `document.body`
      // height on focus, which on iOS 17+/18 detaches the WKWebView input
      // session after the first character and freezes all subsequent
      // taps/keys. Do NOT change this back to "body".
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
