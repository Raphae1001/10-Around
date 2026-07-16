import ngeohash from "ngeohash";

/** Encode GPS coordinates to a geohash zone (default precision 6 ≈ 1.2×0.6 km). */
export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  return ngeohash.encode(lat, lng, precision);
}

/** Decode a geohash zone to its center coordinates. */
export function decodeGeohash(zone: string): { lat: number; lng: number } {
  const { latitude, longitude } = ngeohash.decode(zone);
  return { lat: latitude, lng: longitude };
}

/** Haversine distance in metres between two lat/lng points. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
