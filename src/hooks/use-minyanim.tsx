import { useEffect, useState, useCallback, useId } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MinyanRow = Database["public"]["Tables"]["minyanim"]["Row"];

// Stale-while-revalidate cache shared across mounts/navigations. Keyed by a
// coarse position (~1 km) + radius so returning to /home paints the last known
// pins instantly instead of flashing an empty map while the RPC round-trips.
const nearbyCache = new Map<string, MinyanRow[]>();
const cacheKey = (p: { lat: number; lng: number }, r: number) =>
  `${p.lat.toFixed(2)},${p.lng.toFixed(2)},${r}`;

/** Nearby live minyanim: street + scheduled (from creation), both within radius. */
export function useNearbyMinyanim(
  position: { lat: number; lng: number } | null,
  radiusMeters = 1000,
) {
  const [data, setData] = useState<MinyanRow[]>(() =>
    position ? (nearbyCache.get(cacheKey(position, radiusMeters)) ?? []) : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Unique channel per hook instance. supabase.channel(topic) dedupes by topic
  // and returns an already-joined instance if the name collides; calling .on()
  // on a joined channel throws. Two mounts (e.g. home map + drawer list) must
  // therefore not share a channel name.
  const channelId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const refresh = useCallback(async () => {
    if (!position) {
      setData([]);
      return;
    }
    const key = cacheKey(position, radiusMeters);
    const cached = nearbyCache.get(key);
    if (cached) setData(cached); // paint stale immediately, revalidate below
    setLoading(true);
    const { data: rows, error: err } = await supabase.rpc("nearby_minyanim", {
      lat: position.lat,
      lng: position.lng,
      radius_m: radiusMeters,
    });
    if (err) setError(err.message);
    else {
      const fresh = (rows as MinyanRow[]) ?? [];
      nearbyCache.set(key, fresh);
      setData(fresh);
    }
    setLoading(false);
  }, [position, radiusMeters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: any change to minyanim → refresh. Debounced so a burst of
  // postgres_changes (e.g. many joins at once) collapses into a single RPC.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 400);
    };
    const ch = supabase
      .channel(`minyanim-live-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "minyanim" }, debouncedRefresh)
      // minyan_participants no longer in realtime publication for privacy;
      // present_count is synced into minyanim by trigger, which we already listen to.
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [refresh, channelId]);

  return { data, loading, error, refresh };
}

export async function joinMinyan(minyanId: string, userId: string) {
  const result = await supabase
    .from("minyan_participants")
    .insert({ minyan_id: minyanId, user_id: userId });
  if (!result.error) {
    void import("@/lib/analytics").then(({ track }) =>
      track("join_minyan", { minyan_id: minyanId }),
    );
  }
  return result;
}

export async function leaveMinyan(minyanId: string, userId: string) {
  const result = await supabase
    .from("minyan_participants")
    .delete()
    .eq("minyan_id", minyanId)
    .eq("user_id", userId);
  if (!result.error) {
    void import("@/lib/analytics").then(({ track }) =>
      track("leave_minyan", { minyan_id: minyanId }),
    );
  }
  return result;
}
