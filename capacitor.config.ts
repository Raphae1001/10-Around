import type { CapacitorConfig } from "@capacitor/cli";

// True native app: Capacitor loads the bundled web build from disk (webDir).
// We do NOT set server.url — that would make the app a website wrapper and
// Apple rejects those under guideline 4.2.
const config: CapacitorConfig = {
  appId: "com.raphaelkalfon.minyannow",
  appName: "MinyanNow",
  // SPA build for Capacitor lives in `dist-mobile/` (see vite.mobile.config.ts
  // and `npm run build:mobile`). The default `dist/` is the SSR/Nitro output
  // used by the hosted web deployment and does NOT contain an index.html.
  webDir: "dist-mobile",
  ios: {
    // `never` + CSS env(safe-area-inset-*) = edge-to-edge like a native app.
    // Do not use `automatic` here — it double-insets with our shell padding.
    contentInset: "never",
    backgroundColor: "#ffffff",
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: "mobile",
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
      overlaysWebView: true,
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
