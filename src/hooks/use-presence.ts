import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { encodeGeohash } from "@/lib/geo";
import { getPresenceLevel, isPresenceLevel, type PresenceLevel } from "@/lib/presence-prefs";
import type { GeoPosition } from "@/hooks/use-geolocation";

/** Minimum movement before re-upserting presence (metres) — ponctual mode only. */
const UPSERT_MOVE_THRESHOLD_M = 200;

function movedEnough(prev: { lat: number; lng: number } | null, next: GeoPosition): boolean {
  if (!prev) return true;
  const dLat = ((next.lat - prev.lat) * Math.PI) / 180;
  const dLng = ((next.lng - prev.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((prev.lat * Math.PI) / 180) *
      Math.cos((next.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const dist = 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return dist >= UPSERT_MOVE_THRESHOLD_M;
}

/**
 * Upserts blurred presence (geohash zone only) when the user has a GPS fix.
 * Respects presence_level from settings (off / ponctual / active_foreground).
 */
export function usePresence(position: GeoPosition | null, enabled = true, userId?: string) {
  const lastUpsertRef = useRef<{ lat: number; lng: number; zone: string } | null>(null);
  const [level, setLevel] = useState<PresenceLevel>("ponctual");

  // Latest inputs, so refresh() can force-upsert without stale closures.
  const stateRef = useRef({ position, level, enabled, userId });
  stateRef.current = { position, level, enabled, userId };

  useEffect(() => {
    let cancelled = false;
    void getPresenceLevel(userId).then((l) => {
      if (!cancelled) setLevel(l);
    });
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<PresenceLevel>).detail;
      if (isPresenceLevel(next)) setLevel(next);
    };
    window.addEventListener("presence-level-changed", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("presence-level-changed", onChange);
    };
  }, [userId]);

  useEffect(() => {
    if (!enabled || !position || level === "off") return;

    const zone = encodeGeohash(position.lat, position.lng);
    const last = lastUpsertRef.current;
    if (last && last.zone === zone) return;
    if (level === "ponctual" && last && !movedEnough(last, position)) return;

    void supabase.rpc("upsert_presence", { zone }).then(async ({ error }) => {
      if (!error) {
        lastUpsertRef.current = { lat: position.lat, lng: position.lng, zone };
        if (userId && level !== "ponctual") {
          await supabase
            .from("member_presence")
            .update({ presence_level: level, opt_out: false })
            .eq("user_id", userId);
        }
      }
    });
  }, [enabled, position?.lat, position?.lng, position, level, userId]);

  /**
   * Force-renew presence for the current position, bypassing the movement /
   * same-zone guard. Server sets last_seen_at = now(), so a stationary user
   * stays inside the freshness window (counted on the map for another hour).
   */
  const refresh = useCallback(async () => {
    const s = stateRef.current;
    if (!s.enabled || !s.position || s.level === "off") return;
    const zone = encodeGeohash(s.position.lat, s.position.lng);
    const { error } = await supabase.rpc("upsert_presence", { zone });
    if (error) return;
    lastUpsertRef.current = { lat: s.position.lat, lng: s.position.lng, zone };
    if (s.userId && s.level !== "ponctual") {
      await supabase
        .from("member_presence")
        .update({ presence_level: s.level, opt_out: false })
        .eq("user_id", s.userId);
    }
  }, []);

  return { refresh };
}
