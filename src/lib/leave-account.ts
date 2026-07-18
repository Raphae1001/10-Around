import { supabase } from "@/integrations/supabase/client";

/**
 * Permanently deletes the current auth user (and cascaded app data), then
 * clears local session/storage. Used for both "Delete account" and "Sign out"
 * — product decision: leaving the app removes the anonymous account.
 */
export async function deleteAccountAndLeave(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
  if (error) throw error;
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
}

export function goToWelcomeAfterLeave(): void {
  if (typeof window !== "undefined") {
    window.location.assign("/onboarding");
  }
}
