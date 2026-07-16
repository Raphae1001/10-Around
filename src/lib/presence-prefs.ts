import { getAppPref, setAppPref } from "@/lib/app-prefs";
import { supabase } from "@/integrations/supabase/client";

export type PresenceLevel = "off" | "ponctual" | "active_foreground";

const PREF_KEY = "presence.level";

export const PRESENCE_LEVELS: PresenceLevel[] = ["off", "ponctual", "active_foreground"];

export function isPresenceLevel(v: string | null | undefined): v is PresenceLevel {
  return v === "off" || v === "ponctual" || v === "active_foreground";
}

/** Load presence level: app pref first, then server row if logged in. */
export async function getPresenceLevel(userId?: string): Promise<PresenceLevel> {
  const saved = await getAppPref(PREF_KEY);
  if (isPresenceLevel(saved)) return saved;

  if (userId) {
    const { data } = await supabase
      .from("member_presence")
      .select("presence_level, opt_out")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      if (data.opt_out || data.presence_level === "off") return "off";
      if (isPresenceLevel(data.presence_level)) return data.presence_level;
    }
  }

  return "ponctual";
}

/** Persist locally + sync server row when it exists. */
export async function setPresenceLevel(level: PresenceLevel, userId?: string): Promise<void> {
  await setAppPref(PREF_KEY, level);

  if (userId) {
    await supabase
      .from("member_presence")
      .update({
        presence_level: level,
        opt_out: level === "off",
      })
      .eq("user_id", userId);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("presence-level-changed", { detail: level }));
  }
}
