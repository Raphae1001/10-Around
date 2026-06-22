import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.minyanstreet",
  appName: "MinyanStreet",
  // For v1 we wrap the published Lovable web app inside the native shell.
  // This gives instant updates without re-submitting to the App Store
  // for every UI tweak. Later we can build a static export if we need offline.
  webDir: "dist",
  server: {
    url: "https://global-minyan-connect.lovable.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#ffffff",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
