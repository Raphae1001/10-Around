import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { decodeGeohash, distanceMeters } from "@/lib/geo";
import type { GeoPosition } from "@/hooks/use-geolocation";

export type DensityZone = {
  zone: string;
  lat: number;
  lng: number;
  memberCount: number;
  /** 0–1 normalised intensity for halo rendering */
  intensity: number;
};

const REFRESH_MS = 90_000; // 1.5 min — halos are not real-time
const MOVE_THRESHOLD_M = 500;

export function useDensity(position: GeoPosition | null, radiusM = 5000) {
  const [zones, setZones] = useState<DensityZone[]>([]);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<{ lat: number; lng: number; at: number } | null>(null);

  const fetchDensity = useCallback(
    async (pos: GeoPosition, force = false) => {
      const now = Date.now();
      const last = lastFetchRef.current;
      if (!force && last) {
        const moved = distanceMeters(last, pos);
        const elapsed = now - last.at;
        if (moved < MOVE_THRESHOLD_M && elapsed < REFRESH_MS) return;
      }

      setLoading(true);
      try {
        const [{ data: densityRows, error: dErr }, { data: count, error: cErr }] =
          await Promise.all([
            supabase.rpc("zone_density", { lat: pos.lat, lng: pos.lng, radius_m: radiusM }),
            supabase.rpc("active_members_count", { lat: pos.lat, lng: pos.lng, radius_m: radiusM }),
          ]);

        if (dErr) throw dErr;
        if (cErr) throw cErr;

        const rows = densityRows ?? [];
        const maxCount = Math.max(1, ...rows.map((r) => Number(r.member_count)));
        const decoded: DensityZone[] = rows.map((r) => {
          const center = decodeGeohash(r.zone);
          const memberCount = Number(r.member_count);
          return {
            zone: r.zone,
            lat: center.lat,
            lng: center.lng,
            memberCount,
            intensity: memberCount / maxCount,
          };
        });

        setZones(decoded);
        setActiveCount(count != null ? Number(count) : null);
        setLastUpdatedAt(now);
        setError(null);
        lastFetchRef.current = { lat: pos.lat, lng: pos.lng, at: now };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Density fetch failed");
      } finally {
        setLoading(false);
      }
    },
    [radiusM],
  );

  useEffect(() => {
    if (!position) return;
    void fetchDensity(position);
    const interval = setInterval(() => void fetchDensity(position, true), REFRESH_MS);
    return () => clearInterval(interval);
  }, [position?.lat, position?.lng, fetchDensity, position]);

  return {
    zones,
    activeCount,
    lastUpdatedAt,
    loading,
    error,
    refresh: () => position && fetchDensity(position, true),
  };
}
