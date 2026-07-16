/**
 * Durable app preferences. Web uses localStorage; native uses
 * @capacitor/preferences (UserDefaults / SharedPreferences).
 *
 * Unlike native-storage.ts (Supabase auth tokens only), this covers
 * general app state that must survive WKWebView localStorage eviction.
 */
import { Capacitor } from "@capacitor/core";

export async function getAppPref(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      return null;
    }
  }
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setAppPref(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key, value });
    } catch {}
    return;
  }
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {}
}
