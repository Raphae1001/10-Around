/**
 * Native OAuth bridge for MinyanNow (Capacitor iOS + Android).
 *
 * Why a separate module?
 *  - The hosted web flow uses the Lovable broker which opens a popup and
 *    uses postMessage to deliver tokens. That path does NOT work in a
 *    Capacitor WebView (no parent window, custom scheme blocked, popup
 *    blocked by ASWebAuthenticationSession).
 *  - On native we must:
 *      1. Ask Supabase for the provider authorization URL (no redirect).
 *      2. Open it in @capacitor/browser (SFSafariViewController on iOS,
 *         Chrome Custom Tab on Android).
 *      3. Receive the OAuth callback as a deep link (minyannow://auth/callback)
 *         via App.addListener('appUrlOpen').
 *      4. Hand the tokens to supabase.auth.setSession().
 *      5. Close the in-app browser.
 *
 * The HTTPS callback page at /auth/callback bridges the provider redirect
 * (https → minyannow:// scheme) so iOS reliably reopens the app.
 *
 * Web behavior is untouched: callers still use `lovable.auth.signInWithOAuth`.
 */

import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export const NATIVE_REDIRECT = "minyannow://auth/callback";
// Public HTTPS host that runs the Lovable OAuth broker. Native must enter
// via this origin so the managed Google/Apple client secrets are used.
export const HTTPS_ORIGIN = "https://global-minyan-connect.lovable.app";
export const HTTPS_REDIRECT_BRIDGE = `${HTTPS_ORIGIN}/auth/callback?native=1`;
export const HTTPS_NATIVE_START = `${HTTPS_ORIGIN}/auth/native-start`;

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

let inFlight = false;
let listenersRegistered = false;
let coldStartChecked = false;

/**
 * Begin a native OAuth sign-in. Idempotent — rapid taps are dropped.
 *
 * Flow:
 *   App          ──Browser.open(/auth/native-start?provider=…)──►  Lovable broker page
 *   Broker page  ──lovable.auth.signInWithOAuth──►                 Google / Apple
 *   Provider     ──redirect──►                                     /auth/callback?native=1
 *   Callback     ──location.replace(minyannow://…)──►              iOS / Android
 *   OS           ──appUrlOpen──►                                   App.addListener
 *   App          ──setSession──►                                   Supabase  → SIGNED_IN
 *   App          ──Browser.close()──►                              dismiss browser
 *
 * NB: we deliberately do NOT call `supabase.auth.signInWithOAuth` here.
 * That path hits Supabase `/authorize` directly, which on Lovable Cloud has
 * no Google client secret configured and returns `missing OAuth secret`.
 * The broker holds the managed secret.
 */
export async function nativeOAuthSignIn(
  provider: "google" | "apple",
): Promise<{ error: Error | null }> {
  if (!isNative()) {
    return { error: new Error("nativeOAuthSignIn called outside Capacitor") };
  }
  if (inFlight) {
    return { error: null };
  }
  inFlight = true;

  try {
    await ensureDeepLinkListener();

    const url = `${HTTPS_NATIVE_START}?provider=${encodeURIComponent(provider)}`;

    const { Browser } = await import("@capacitor/browser");
    try { await Browser.close(); } catch { /* nothing was open */ }
    await Browser.open({
      url,
      windowName: "_self",
      presentationStyle: "fullscreen",
    });

    return { error: null };
  } catch (err) {
    inFlight = false;
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// Re-export for any caller still referencing the old name.
export { supabase as _supabase };


/**
 * Register the `appUrlOpen` listener exactly once. Also processes the cold
 * start URL (when iOS launches the app fresh via a deep link).
 *
 * Safe to call from any client mount point; idempotent guards prevent
 * duplicate registrations and duplicate session writes.
 */
export async function ensureDeepLinkListener(): Promise<void> {
  if (!isNative()) return;
  if (listenersRegistered) return;
  listenersRegistered = true;

  const { App } = await import("@capacitor/app");

  await App.addListener("appUrlOpen", (event) => {
    void handleCallbackUrl(event.url);
  });

  if (!coldStartChecked) {
    coldStartChecked = true;
    try {
      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        void handleCallbackUrl(launch.url);
      }
    } catch {
      /* nothing to restore */
    }
  }
}

/**
 * Parse a minyannow://auth/callback (or universal link equivalent) URL and
 * apply the resulting session to Supabase.
 */
async function handleCallbackUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return;
  }

  const isAuthCallback =
    /\/auth\/callback\/?$/.test(parsed.pathname) ||
    parsed.host === "auth" ||
    parsed.pathname === "/auth/callback";

  if (!isAuthCallback) return;

  // Tokens can ride on either the hash (implicit, our default flow) or query
  // (PKCE / error responses). Normalize both into a single param bag.
  const params = new URLSearchParams(parsed.search || "");
  if (parsed.hash) {
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    new URLSearchParams(hash).forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  }

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const code = params.get("code");
  const errorDescription = params.get("error_description") || params.get("error");

  try {
    if (errorDescription) {
      console.error("[native-auth] OAuth error:", errorDescription);
      return;
    }

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        console.error("[native-auth] setSession failed:", error.message);
        return;
      }
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[native-auth] exchangeCodeForSession failed:", error.message);
        return;
      }
    } else {
      // Nothing actionable — likely a non-auth deep link. Bail silently.
      return;
    }

    // Close the in-app browser ONLY after the session is restored, so the
    // user is never dropped back into an empty app shell.
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.close();
    } catch {
      /* browser already closed */
    }

    // Move the WebView into the authenticated area. We use a full-document
    // navigation so any onAuthStateChange listeners in the new route fire
    // against the freshly restored session.
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/home")) {
      window.location.assign("/home");
    }
  } finally {
    inFlight = false;
  }
}

/**
 * Clear Capacitor Preferences entries on sign-out so a re-login starts clean.
 * Supabase's own session is cleared by supabase.auth.signOut().
 */
export async function nativeAuthClear(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    // Remove anything that looks like a Supabase auth blob persisted via the
    // native bridge. Safe no-ops when nothing matches.
    const { keys } = await Preferences.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("sb-") || k.includes("auth-token") || k.includes("code-verifier"))
        .map((k) => Preferences.remove({ key: k })),
    );
  } catch {
    /* preferences plugin unavailable — nothing to clean */
  }
}
