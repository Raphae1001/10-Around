import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { NEARBY_ALERTS_PREF_KEY } from "@/lib/presence-prefs";

/**
 * Forgets what this device remembered about the person who just left. `everything` (account
 * deleted) wipes all app preferences, so the next sign-up starts like a fresh install: the
 * explanation screens come back and no earlier consent carries over. Otherwise (plain sign-out)
 * only the nearby-alerts consent is dropped: it belongs to the account, and the server gives it
 * back when the same person signs in again. System permissions (location, notifications) are
 * owned by iOS and cannot be reset from the app.
 */
async function forgetLocalChoices(everything: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    if (everything) await Preferences.clear();
    else await Preferences.remove({ key: NEARBY_ALERTS_PREF_KEY });
  } catch {
    /* preferences plugin unavailable — nothing to clean */
  }
}

/**
 * Signs a real (Apple/Google) account out without deleting anything — their
 * profile, minyan history, and trust score persist for next login. Guests
 * have no password/provider to come back with, so their "sign out" is a full
 * delete instead (see deleteAccountAndLeave).
 */
export async function signOutAndLeave(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
  try {
    const { nativeAuthClear } = await import("@/lib/native-auth");
    await nativeAuthClear();
  } catch {
    /* native prefs unavailable */
  }
  await forgetLocalChoices(false);
}

/**
 * Permanently deletes the current auth user (and cascaded app data), then
 * clears local session/storage. Used for both "Delete account" and "Sign out"
 * for guest (anonymous) accounts — product decision: leaving the app removes
 * the anonymous account since there's no way back into it otherwise.
 */
export async function deleteAccountAndLeave(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
  if (error) {
    // supabase-js's FunctionsHttpError only carries a generic
    // "Edge Function returned a non-2xx status code" message; the real
    // reason is in the unconsumed Response body on `error.context`.
    const context = (error as { context?: Response }).context;
    let realMessage: string | null = null;
    if (context && typeof context.json === "function") {
      try {
        const body = await context.clone().json();
        if (body && typeof body.error === "string") realMessage = body.error;
      } catch {
        /* not JSON, or already consumed — fall back to the generic error */
      }
    }
    throw realMessage ? new Error(realMessage) : error;
  }
  if (data && typeof data === "object" && "ok" in data && (data as { ok?: boolean }).ok === false) {
    throw new Error(
      typeof (data as { error?: string }).error === "string"
        ? (data as { error: string }).error
        : "Delete failed",
    );
  }

  try {
    await supabase.auth.signOut();
  } catch {
    /* already deleted */
  }
  try {
    const { nativeAuthClear } = await import("@/lib/native-auth");
    await nativeAuthClear();
  } catch {
    /* native prefs unavailable */
  }
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
  await forgetLocalChoices(true);
}

export function goToWelcomeAfterLeave(): void {
  if (typeof window !== "undefined") {
    window.location.assign("/onboarding");
  }
}
