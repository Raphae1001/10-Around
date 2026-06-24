import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.minyannow",
  appName: "MinyanNow",
  // For v1 we wrap the published Lovable web app inside the native shell.
  // This gives instant updates without re-submitting to the App Store
  // for every UI tweak. Later we can build a static export if we need offline.
  webDir: "dist",
  server: {
    url: "https://global-minyan-connect.lovable.app",
    cleartext: false,
    // Restrict the WebView to our published origin — any link to a
    // different host (Google Maps, WhatsApp, etc.) opens externally
    // instead of inside the app. Required for App Store review.
    allowNavigation: ["global-minyan-connect.lovable.app"],
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#ffffff",
    // Required by App Review for production; HTTPS-only.
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: "#ffffff",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
