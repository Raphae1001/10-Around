import type { CapacitorConfig } from "@capacitor/cli";

const PROD_HOST = "global-minyan-connect.lovable.app";

const config: CapacitorConfig = {
  appId: "app.lovable.minyannow",
  appName: "MinyanNow",
  // v1 wraps the published Lovable web app — instant updates without
  // re-submitting to the App Store / Play Store for UI tweaks.
  webDir: "dist",
  server: {
    url: `https://${PROD_HOST}`,
    cleartext: false,
    // WebView is restricted to our published origin. Off-origin links
    // (Google Maps, WhatsApp, tel:, mailto:) open in the system handler.
    allowNavigation: [PROD_HOST],
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#ffffff",
    // Required by App Review for production; HTTPS-only.
    limitsNavigationsToAppBoundDomains: true,
    // Custom URL scheme used for OAuth callbacks + share intents.
    scheme: "minyannow",
  },
  android: {
    backgroundColor: "#ffffff",
    // Allow Google sign-in to surface the Chrome Custom Tab.
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
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
