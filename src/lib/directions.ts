/**
 * Open turn-by-turn directions in Google Maps — always externally.
 * Universal Google Maps URLs hand off to the native Google Maps / Apple
 * Maps app automatically on iOS/Android when installed, so we never need
 * custom schemes like comgooglemaps:// or geo:.
 */
import { openExternal } from "@/lib/external";

export function buildDirectionsUrls(
  lat: number | null | undefined,
  lng: number | null | undefined,
  label?: string,
) {
  const hasCoords =
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng);

  const web = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : label
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`
      : "https://www.google.com/maps";

  return { web };
}

/** Opens Google Maps directions in a new top-level tab / external app. */
export function openDirections(
  lat: number | null | undefined,
  lng: number | null | undefined,
  label?: string,
) {
  const { web } = buildDirectionsUrls(lat, lng, label);
  void import("@/lib/analytics").then(({ track }) => track("open_maps", { has_coords: typeof lat === "number" && typeof lng === "number" }));
  openExternal(web);
}
