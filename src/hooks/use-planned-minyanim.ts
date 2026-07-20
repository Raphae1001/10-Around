import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MinyanRow } from "@/hooks/use-minyanim";
import { reverseNeighborhood } from "@/lib/geocoding";
import { stayCityKey } from "@/lib/stay";

const LAST_POSITION_KEY = "minyan:last-position";

function readLastPosition(): { lat: number; lng: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_POSITION_KEY);
    if (!raw) return null;
    const pos = JSON.parse(raw) as { lat?: number; lng?: number };
    if (typeof pos.lat === "number" && typeof pos.lng === "number") {
      return { lat: pos.lat, lng: pos.lng };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Scheduled + stay for the Planned screen.
 * Each viewer sees minyanim in their own city, plus everything they created
 * themselves regardless of city/country (see planned_minyanim RPC).
 * Scheduled also appear on the live map from creation at the chosen location (see isLiveOnMap).
 */
export function usePlannedMinyanim() {
  const [rows, setRows] = useState<MinyanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const refresh = useCallback(async () => {
    setLoading(true);
    let cityKey: string | undefined;
    const pos = readLastPosition();
    if (pos) {
      const cityName = await reverseNeighborhood(pos.lat, pos.lng);
      if (cityName) cityKey = stayCityKey(cityName);
    }

    const { data, error: err } = await supabase.rpc("planned_minyanim", {
      _city_key: cityKey,
    });

    if (err) setError(err.message);
    else {
      setRows((data as MinyanRow[]) ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const ch = supabase
      .channel(`planned-minyanim-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "minyanim" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refresh, channelId]);

  const scheduled = useMemo(
    () =>
      rows
        .filter((r) => r.type === "scheduled")
        .sort(
          (a, b) =>
            new Date(a.scheduled_at ?? a.created_at).getTime() -
            new Date(b.scheduled_at ?? b.created_at).getTime(),
        ),
    [rows],
  );

  const stays = useMemo(
    () =>
      rows
        .filter((r) => r.type === "stay")
        .sort(
          (a, b) =>
            new Date(a.trip_start_date ?? a.created_at).getTime() -
            new Date(b.trip_start_date ?? b.created_at).getTime(),
        ),
    [rows],
  );

  return { scheduled, stays, loading, error, refresh };
}
