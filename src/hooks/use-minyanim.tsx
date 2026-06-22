import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MinyanRow = Database["public"]["Tables"]["minyanim"]["Row"];

/** Live list of minyanim near the user (street/airport within radius) + all hotel/travel ones. */
export function useNearbyMinyanim(position: { lat: number; lng: number } | null, radiusMeters = 1000) {
  const [data, setData] = useState<MinyanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!position) {
      setData([]);
      return;
    }
    setLoading(true);
    const { data: rows, error: err } = await supabase.rpc("nearby_minyanim", {
      lat: position.lat,
      lng: position.lng,
      radius_m: radiusMeters,
    });
    if (err) setError(err.message);
    else setData((rows as MinyanRow[]) ?? []);
    setLoading(false);
  }, [position, radiusMeters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: any change to minyanim or participants → refresh
  useEffect(() => {
    const ch = supabase
      .channel("minyanim-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "minyanim" }, () => refresh())
      // minyan_participants no longer in realtime publication for privacy;
      // present_count is synced into minyanim by trigger, which we already listen to.
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}

export async function joinMinyan(minyanId: string, userId: string) {
  return supabase.from("minyan_participants").insert({ minyan_id: minyanId, user_id: userId });
}

export async function leaveMinyan(minyanId: string, userId: string) {
  return supabase
    .from("minyan_participants")
    .delete()
    .eq("minyan_id", minyanId)
    .eq("user_id", userId);
}
