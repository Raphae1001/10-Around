import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

const API_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;

export type MapPinDatum = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  tone?: "gold" | "urgent" | "success" | "sky";
  onClick?: () => void;
};

const toneColor: Record<NonNullable<MapPinDatum["tone"]>, string> = {
  gold: "#D4A537",
  urgent: "#E5484D",
  success: "#46A758",
  sky: "#3B82F6",
};

function Recenter({ center }: { center: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && center) map.panTo(center);
  }, [map, center]);
  return null;
}

export function GoogleMapCanvas({
  center,
  user,
  pins,
  className = "",
}: {
  center: { lat: number; lng: number };
  user?: { lat: number; lng: number } | null;
  pins: MapPinDatum[];
  className?: string;
}) {
  if (!API_KEY) {
    return (
      <div className={`flex items-center justify-center text-xs text-muted-foreground p-4 ${className}`}>
        Google Maps key missing.
      </div>
    );
  }
  return (
    <div className={className}>
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI
          style={{ width: "100%", height: "100%" }}
        >
          <Recenter center={center} />
          {user && (
            <Marker
              position={user}
              icon={{
                path: 0, // google.maps.SymbolPath.CIRCLE
                scale: 8,
                fillColor: "#3B82F6",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              } as any}
            />
          )}
          {pins.map((p) => (
            <Marker
              key={p.id}
              position={{ lat: p.lat, lng: p.lng }}
              onClick={p.onClick}
              label={p.label ? { text: p.label, color: "#fff", fontSize: "11px", fontWeight: "700" } : undefined}
              icon={{
                path: "M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8z",
                fillColor: toneColor[p.tone ?? "gold"],
                fillOpacity: 1,
                strokeColor: "#1a1a2e",
                strokeWeight: 1.5,
                scale: 1.8,
                anchor: { x: 12, y: 22 } as any,
                labelOrigin: { x: 12, y: 10 } as any,
              } as any}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
