import { describe, expect, it } from "vitest";
import { decodeGeohash, distanceMeters, encodeGeohash } from "@/lib/geo";

describe("distanceMeters", () => {
  it("is zero for the same point", () => {
    expect(distanceMeters({ lat: 31.78, lng: 35.22 }, { lat: 31.78, lng: 35.22 })).toBe(0);
  });

  it("matches a known reference distance (Paris to London, ~343km)", () => {
    const paris = { lat: 48.8566, lng: 2.3522 };
    const london = { lat: 51.5074, lng: -0.1278 };
    const d = distanceMeters(paris, london);
    expect(d).toBeGreaterThan(340_000);
    expect(d).toBeLessThan(346_000);
  });

  it("is symmetric", () => {
    const a = { lat: 40.7128, lng: -74.006 };
    const b = { lat: 34.0522, lng: -118.2437 };
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });
});

describe("encodeGeohash / decodeGeohash", () => {
  it("round-trips to a nearby point at default precision", () => {
    const original = { lat: 31.7767, lng: 35.2345 };
    const zone = encodeGeohash(original.lat, original.lng);
    const decoded = decodeGeohash(zone);
    // Geohash precision 6 cells are ~1.2km x 0.6km, so the center can be
    // meaningfully offset from the original point.
    expect(distanceMeters(original, decoded)).toBeLessThan(1500);
  });
});
