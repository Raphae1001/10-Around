import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { encodeGeohash } from "@/lib/geo";
import { getPresenceLevel, type PresenceLevel } from "@/lib/presence-prefs";
import type { GeoPosition } from "@/hooks/use-geolocation";

/** Minimum movement before re-sending the zone (metres). */
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
 * Keeps the user's blurred zone (geohash, ~1 km) up to date on the server so
 * they can be notified when a minyan starts nearby. Only runs for users who
 * opted in; the zone is never shown to other users.
 */
export function usePresence(position: GeoPosition | null, enabled = true, userId?: string) {
  const lastUpsertRef = useRef<{ lat: number; lng: number; zone: string } | null>(null);
  const [level, setLevel] = useState<PresenceLevel>("off");

  const stateRef = useRef({ position, level, enabled });
  stateRef.current = { position, level, enabled };

  useEffect(() => {
    let cancelled = false;
    void getPresenceLevel(userId).then((l) => {
      if (!cancelled) setLevel(l);
    });
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<PresenceLevel>).detail;
      if (next === "off" || next === "ponctual") {
        if (next === "off") lastUpsertRef.current = null;
        setLevel(next);
      }
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
    if (last && !movedEnough(last, position)) return;

    void supabase.rpc("set_nearby_alerts", { _enabled: true, _zone: zone }).then(({ error }) => {
      if (!error) lastUpsertRef.current = { lat: position.lat, lng: position.lng, zone };
    });
  }, [enabled, position?.lat, position?.lng, position, level]);

  /** Force-renew the stored zone for the current position (e.g. after a manual refresh). */
  const refresh = useCallback(async () => {
    const s = stateRef.current;
    if (!s.enabled || !s.position || s.level === "off") return;
    const zone = encodeGeohash(s.position.lat, s.position.lng);
    const { error } = await supabase.rpc("set_nearby_alerts", { _enabled: true, _zone: zone });
    if (!error) lastUpsertRef.current = { lat: s.position.lat, lng: s.position.lng, zone };
  }, []);

  return { refresh };
}
