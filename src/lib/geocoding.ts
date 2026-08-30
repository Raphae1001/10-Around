// Reverse geocoding helper — returns the best human-readable street/address
// for given coordinates using Google Maps Geocoding API.

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined;

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

/**
 * Reverse geocode to a human neighborhood/area name (not a full street address).
 * Prefers neighborhood → sublocality → locality → admin area. Used for the
 * honest presence counter ("X members around you · Herzliya").
 */
export async function reverseNeighborhood(lat: number, lng: number): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=neighborhood|sublocality|locality|administrative_area_level_2&key=${API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== "OK" || !json.results?.length) return null;

    const priority = [
      "neighborhood",
      "sublocality",
      "sublocality_level_1",
      "locality",
      "administrative_area_level_2",
    ];
    for (const type of priority) {
      for (const result of json.results as any[]) {
        const comp = (result.address_components as any[] | undefined)?.find((c) =>
          c.types?.includes(type),
        );
        if (comp?.long_name) return comp.long_name as string;
      }
    }
    return null;
  } catch {
    return null;
  }
}
