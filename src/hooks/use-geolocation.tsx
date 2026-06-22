import { useCallback, useEffect, useState } from "react";

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

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation not supported");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos: GeoPosition = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        };
        setPosition(pos);
        setError(null);
        setLoading(false);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
        } catch {}
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    if (autoRequest && !position) request();
  }, [autoRequest, position, request]);

  return { position, error, loading, request };
}
