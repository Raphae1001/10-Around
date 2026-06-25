import { useCallback, useEffect, useState } from "react";
import { getCurrentPosition } from "@/lib/native";

export type GeoPosition = { lat: number; lng: number; accuracy?: number };

const STORAGE_KEY = "minyan:last-position";

export function useGeolocation(autoRequest = true) {
  const [position, setPosition] = useState<GeoPosition | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as GeoPosition) : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(async () => {
    setLoading(true);
    try {
      // Single source of truth: native uses @capacitor/geolocation (which
      // handles iOS/Android permission prompts), web falls back to
      // navigator.geolocation. See src/lib/native.ts.
      const pos = await getCurrentPosition();
      if (!pos) {
        setError("Location unavailable");
        setLoading(false);
        return;
      }
      setPosition(pos);
      setError(null);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "Location error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoRequest && !position) void request();
  }, [autoRequest, position, request]);

  return { position, error, loading, request };
}
