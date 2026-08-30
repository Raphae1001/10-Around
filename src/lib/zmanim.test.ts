import { afterAll, describe, expect, it } from "vitest";
import { currentPrayerWindowZmanim, getZmanim } from "@/lib/zmanim";

const originalTz = process.env.TZ;

afterAll(() => {
  process.env.TZ = originalTz;
});

describe("getZmanim — standard latitude", () => {
  it("returns a full, ordered set of zmanim for Jerusalem", () => {
    const z = getZmanim(31.7767, 35.2345, "ashkenaze", new Date("2026-06-15T12:00:00Z"));
    expect(z.alotHashachar).not.toBeNull();
    expect(z.netzHachama).not.toBeNull();
    expect(z.chatzot).not.toBeNull();
    expect(z.shkiatHachama).not.toBeNull();
    expect(z.alotHashachar!.getTime()).toBeLessThan(z.netzHachama!.getTime());
    expect(z.netzHachama!.getTime()).toBeLessThan(z.chatzot!.getTime());
    expect(z.chatzot!.getTime()).toBeLessThan(z.shkiatHachama!.getTime());
  });

  it("gives sepharade the same astronomical baseline as ashkenaze", () => {
    const at = new Date("2026-06-15T12:00:00Z");
    const ashkenaze = getZmanim(31.7767, 35.2345, "ashkenaze", at);
    const sepharade = getZmanim(31.7767, 35.2345, "sepharade", at);
    expect(sepharade.netzHachama!.getTime()).toBe(ashkenaze.netzHachama!.getTime());
    expect(sepharade.shkiatHachama!.getTime()).toBe(ashkenaze.shkiatHachama!.getTime());
  });

  it("gives habad a distinct (not merely relabeled) calculation", () => {
    const at = new Date("2026-06-15T12:00:00Z");
    const ashkenaze = getZmanim(31.7767, 35.2345, "ashkenaze", at);
    const habad = getZmanim(31.7767, 35.2345, "habad", at);
    expect(habad.alotHashachar!.getTime()).not.toBe(ashkenaze.alotHashachar!.getTime());
  });
});

describe("currentPrayerWindowZmanim — standard latitude", () => {
  it("returns shacharit for Jerusalem mid-morning", () => {
    expect(
      currentPrayerWindowZmanim(31.7767, 35.2345, "ashkenaze", new Date("2026-06-15T05:00:00Z")),
    ).toBe("shacharit");
  });

  it("returns maariv for Jerusalem late night", () => {
    expect(
      currentPrayerWindowZmanim(31.7767, 35.2345, "ashkenaze", new Date("2026-06-15T20:00:00Z")),
    ).toBe("maariv");
  });
});

describe("currentPrayerWindowZmanim — extreme-latitude fallback", () => {
  // Longyearbyen, Svalbard (78.22N) is in permanent midsummer daylight, so
  // sunrise/sunset (and therefore alotHashachar/shkiatHachama) don't resolve
  // and getZmanim falls back to a fixed hour-range heuristic.
  const SVALBARD = { lat: 78.2232, lng: 15.6267 };
  const AT = new Date("2026-06-15T18:00:00Z"); // 20:00 local in Arctic/Longyearbyen (UTC+2)

  it("confirms the fallback actually triggers for this date/location", () => {
    const z = getZmanim(SVALBARD.lat, SVALBARD.lng, "ashkenaze", AT);
    expect(z.alotHashachar).toBeNull();
    expect(z.shkiatHachama).toBeNull();
  });

  // Bug: the fallback used `at.getHours()`, the *device's* local time, to
  // decide the window — even though every other branch of this function
  // reasons entirely in the coordinate's own timezone. A device set to a
  // faraway timezone got the wrong prayer window for a real (correctly
  // computed) instant at the target location.
  it("uses the coordinate's own local time, not the device's, for the fallback heuristic", () => {
    process.env.TZ = "Etc/GMT+14"; // UTC-14: device local hour would read ~04:00
    try {
      const result = currentPrayerWindowZmanim(SVALBARD.lat, SVALBARD.lng, "ashkenaze", AT);
      // 20:00 local in Svalbard is unambiguously maariv territory.
      expect(result).toBe("maariv");
    } finally {
      process.env.TZ = originalTz;
    }
  });
});
