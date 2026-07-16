import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MinyanRow } from "@/hooks/use-minyanim";

/**
 * Scheduled + stay for the Planned screen.
 * Scheduled also appear on the live map/list within ±30 min of scheduled_at (see isLiveOnMap).
 */
export function usePlannedMinyanim() {
  const [rows, setRows] = useState<MinyanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("minyanim")
      .select("*")
      .in("type", ["scheduled", "stay"])
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

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
