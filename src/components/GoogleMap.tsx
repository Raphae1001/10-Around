import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
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
          mapId="minyanstreet-map"
          style={{ width: "100%", height: "100%" }}
        >
          <Recenter center={center} />
          {user && (
            <AdvancedMarker position={user}>
              <div className="h-4 w-4 rounded-full bg-sky border-2 border-white shadow-md" />
            </AdvancedMarker>
          )}
          {pins.map((p) => (
            <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }} onClick={p.onClick}>
              <Pin
                background={toneColor[p.tone ?? "gold"]}
                borderColor="#1a1a2e"
                glyphColor="#fff"
                glyph={p.label ?? ""}
              />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
