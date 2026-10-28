import { getAppPref, setAppPref } from "@/lib/app-prefs";
import { supabase } from "@/integrations/supabase/client";

/**
 * Nearby minyan alerts. "ponctual" = the user opted in (the name is kept
 * because the server rows use it); "off" = no consent, nothing is stored.
 * The stored zone is only ever used by the server to decide who gets a push;
 * it is never shown to other users.
 */
export type PresenceLevel = "off" | "ponctual";

// New key on purpose: values stored by older versions (presence on by default)
// were never a consent to nearby alerts and must not be read as one.
const PREF_KEY = "nearby-alerts.level";

/** Local choice first (also covers consent given before sign-in), then the server's record. */
export async function getPresenceLevel(userId?: string): Promise<PresenceLevel> {
  const saved = await getAppPref(PREF_KEY);
  if (saved === "off") return "off";
  if (saved === "ponctual") return "ponctual";

  if (userId) {
    const { data } = await supabase.rpc("my_nearby_alerts");
    if (data === true) return "ponctual";
  }
  return "off";
}

/** Persist the choice locally; opting out also erases the zone stored on the server. */
export async function setPresenceLevel(level: PresenceLevel, userId?: string): Promise<void> {
  await setAppPref(PREF_KEY, level);

  if (level === "off" && userId) {
    await supabase.rpc("set_nearby_alerts", { _enabled: false });
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("presence-level-changed", { detail: level }));
  }
}
