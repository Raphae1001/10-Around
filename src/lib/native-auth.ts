/**
 * OAuth bridge for Capacitor (Apple / Google via Supabase) + small sign-out
 * helpers.
 *
 * Web: supabase.auth.signInWithOAuth() does its own full-page redirect and
 * /auth/callback (src/routes/auth.callback.tsx) picks the session back up.
 *
 * Native: we can't let signInWithOAuth navigate the app's own WKWebView to
 * an external login page, so `skipBrowserRedirect: true` gets us the
 * provider URL without navigating, we open that URL in the system browser
 * via @capacitor/browser, and wait for the app to be reopened through the
 * `minyannow://auth-callback` deep link (registered in Info.plist /
 * AndroidManifest.xml) to hand the resulting code back to Supabase.
 */

import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export const NATIVE_AUTH_REDIRECT = "minyannow://auth-callback";

export type OAuthProvider = "apple" | "google";

/**
 * Clear Capacitor Preferences entries on sign-out so a re-login starts clean.
 * Supabase's own session is cleared by supabase.auth.signOut().
 */
export async function nativeAuthClear(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { keys } = await Preferences.keys();
    await Promise.all(
      keys
        .filter(
          (k) => k.startsWith("sb-") || k.includes("auth-token") || k.includes("code-verifier"),
        )
        .map((k) => Preferences.remove({ key: k })),
    );
  } catch {
    /* preferences plugin unavailable — nothing to clean */
  }
}

/** Extract the PKCE `code` (or implicit-flow tokens) from a deep-link callback URL. */
async function completeSessionFromCallbackUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  const code = parsed.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }
  // Fallback for providers/configs that return an implicit-flow hash instead.
  const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
  const hashParams = new URLSearchParams(hash);
  const access_token = hashParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return;
  }
  throw new Error("No code or tokens in auth callback URL");
}

/**
 * Sign in with Apple/Google on native: opens the system browser and resolves
 * once the deep-link callback lands and the Supabase session is established.
 * Rejects if the user closes the browser before completing sign-in, or after
 * a two-minute timeout.
 */
export async function nativeSignInWithProvider(provider: OAuthProvider): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error("No OAuth URL returned");

  const { App } = await import("@capacitor/app");
  const { Browser } = await import("@capacitor/browser");

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let urlHandle: { remove: () => void } | null = null;
    let closedHandle: { remove: () => void } | null = null;

    const cleanup = () => {
      urlHandle?.remove();
      closedHandle?.remove();
      clearTimeout(timeout);
    };
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      void Browser.close().catch(() => {});
      fn();
    };

    const timeout = setTimeout(() => {
      finish(() => reject(new Error("Sign-in timed out")));
    }, 120_000);

    void App.addListener("appUrlOpen", ({ url }) => {
      if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return;
      completeSessionFromCallbackUrl(url).then(
        () => finish(resolve),
        (e) => finish(() => reject(e)),
      );
    }).then((h) => {
      urlHandle = h;
    });

    void Browser.addListener("browserFinished", () => {
      // A successful OAuth redirect also closes the browser, so appUrlOpen
      // and this event race each other — give appUrlOpen a brief head start
      // before treating the close as an actual user cancellation.
      setTimeout(() => {
        finish(() => reject(new Error("Sign-in cancelled")));
      }, 800);
    }).then((h) => {
      closedHandle = h;
    });

    void Browser.open({ url: data.url, presentationStyle: "popover" });
  });
}

/**
 * Single entry point the UI calls — picks the native deep-link bridge or a
 * plain web redirect depending on platform. On web this navigates away
 * immediately (resolves only if Supabase rejects before the redirect fires).
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<void> {
  if (isNative()) {
    await nativeSignInWithProvider(provider);
    return;
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}

/** Same system-browser + deep-link bridge as sign-in, but for linkIdentity (guest → real account upgrade). */
async function nativeLinkProvider(provider: OAuthProvider): Promise<void> {
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo: NATIVE_AUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error("No OAuth URL returned");

  const { App } = await import("@capacitor/app");
  const { Browser } = await import("@capacitor/browser");

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let urlHandle: { remove: () => void } | null = null;
    let closedHandle: { remove: () => void } | null = null;

    const cleanup = () => {
      urlHandle?.remove();
      closedHandle?.remove();
      clearTimeout(timeout);
    };
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      void Browser.close().catch(() => {});
      fn();
    };

    const timeout = setTimeout(() => {
      finish(() => reject(new Error("Sign-in timed out")));
    }, 120_000);

    void App.addListener("appUrlOpen", ({ url }) => {
      if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return;
      completeSessionFromCallbackUrl(url).then(
        () => finish(resolve),
        (e) => finish(() => reject(e)),
      );
    }).then((h) => {
      urlHandle = h;
    });

    void Browser.addListener("browserFinished", () => {
      setTimeout(() => {
        finish(() => reject(new Error("Sign-in cancelled")));
      }, 800);
    }).then((h) => {
      closedHandle = h;
    });

    void Browser.open({ url: data.url, presentationStyle: "popover" });
  });
}

/** Upgrades the current guest (anonymous) session to a real account, keeping the same user id/history. */
export async function linkProviderIdentity(provider: OAuthProvider): Promise<void> {
  if (isNative()) {
    await nativeLinkProvider(provider);
    return;
  }
  const { error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}
