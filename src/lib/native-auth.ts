/**
 * Capacitor-only auth helpers.
 *
 * The OAuth bridge (Google / Apple via @capacitor/browser + deep links) was
 * removed when MinyanNow switched to anonymous-only onboarding. The only
 * thing left here is a small helper to wipe any leftover Supabase session
 * blobs from @capacitor/preferences on sign-out / "Reset this device".
 */

import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

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
          (k) =>
            k.startsWith("sb-") ||
            k.includes("auth-token") ||
            k.includes("code-verifier"),
        )
        .map((k) => Preferences.remove({ key: k })),
    );
  } catch {
    /* preferences plugin unavailable — nothing to clean */
  }
}
