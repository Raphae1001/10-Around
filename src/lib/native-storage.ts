/**
 * Native (Capacitor) bootstrap for Supabase session persistence.
 *
 * Why this exists:
 *   The shared Supabase client (src/integrations/supabase/client.ts) is
 *   auto-generated and uses localStorage. Inside a WKWebView / Android
 *   WebView, localStorage CAN be wiped by the OS under storage pressure.
 *   For an anonymous-only account (no email recovery), losing the storage
 *   means losing the account entirely.
 *
 * What this does:
 *   1. Before the Supabase client initializes, copy every `sb-*` /
 *      `*auth-token*` blob from @capacitor/preferences (native-backed
 *      keychain-adjacent storage) back into localStorage.
 *   2. After init, subscribe to auth state changes and mirror the current
 *      localStorage entries into Preferences. Preferences thus becomes the
 *      durable backup; localStorage stays the active read path expected by
 *      the auto-generated client.
 *
 * Web builds never call this — they use plain localStorage as before.
 */

import { Capacitor } from "@capacitor/core";

const AUTH_KEY_RX = /^sb-.*-auth-token$|auth-token$|^sb-/;

export async function hydrateNativeSupabaseStorage(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { keys } = await Preferences.keys();
    for (const k of keys) {
      if (!AUTH_KEY_RX.test(k)) continue;
      const { value } = await Preferences.get({ key: k });
      if (value != null && typeof localStorage !== "undefined") {
        // Only restore if localStorage doesn't already hold a value — never
        // overwrite a fresher in-memory token with a stale Preferences copy.
        if (localStorage.getItem(k) == null) {
          localStorage.setItem(k, value);
        }
      }
    }
  } catch (err) {
    console.warn("[native-storage] hydrate failed", err);
  }
}

export async function attachNativeStorageMirror(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const [{ Preferences }, { supabase }] = await Promise.all([
      import("@capacitor/preferences"),
      import("@/integrations/supabase/client"),
    ]);

    async function mirror() {
      if (typeof localStorage === "undefined") return;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !AUTH_KEY_RX.test(k)) continue;
        const v = localStorage.getItem(k);
        if (v != null) {
          try {
            await Preferences.set({ key: k, value: v });
          } catch {}
        }
      }
    }

    // Mirror once on attach, then on every auth state change. SIGNED_OUT
    // also fires here — we leave Preferences in place so the user can
    // recover their anonymous account if they re-open the app; full wipe
    // happens explicitly via nativeAuthClear() on "Reset this device".
    void mirror();
    supabase.auth.onAuthStateChange(() => {
      void mirror();
    });
  } catch (err) {
    console.warn("[native-storage] mirror attach failed", err);
  }
}
