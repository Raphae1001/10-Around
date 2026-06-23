// Reverse geocoding helper — returns the best human-readable street/address
// for given coordinates using Google Maps Geocoding API.

const API_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== "OK" || !json.results?.length) return null;

    // Prefer a result that has "street_address" or "route" component.
    const ranked = (json.results as any[]).find((r) =>
      r.types?.some((t: string) => t === "street_address" || t === "premise" || t === "route"),
    );
    const best = ranked ?? json.results[0];
    return best.formatted_address as string;
  } catch {
    return null;
  }
}
