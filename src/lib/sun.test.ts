import { describe, expect, it } from "vitest";
import { currentPrayerWindow, isDaytime } from "@/lib/sun";

// All instants below are chosen away from equinox/solstice extremes and away
// from the precise crossing moments themselves, so the couple-of-minutes
// accuracy of the NOAA approximation can't flip the expected bucket.

describe("isDaytime", () => {
  it("is true at solar noon UTC over the Gulf of Guinea (lat/lng ~0,0)", () => {
    expect(isDaytime(0, 0, new Date("2026-06-15T12:00:00Z"))).toBe(true);
  });

  it("is false at solar midnight over the Gulf of Guinea", () => {
    expect(isDaytime(0, 0, new Date("2026-06-15T00:00:00Z"))).toBe(false);
  });

  it("is true in Jerusalem at midday local time", () => {
    // Jerusalem (UTC+3 in June) — 09:00Z is noon local.
    expect(isDaytime(31.7767, 35.2345, new Date("2026-06-15T09:00:00Z"))).toBe(true);
  });

  it("is false in Jerusalem at midnight local time", () => {
    expect(isDaytime(31.7767, 35.2345, new Date("2026-06-15T21:00:00Z"))).toBe(false);
  });
});

describe("currentPrayerWindow — normal latitudes", () => {
  it("returns shacharit for Jerusalem mid-morning", () => {
    // ~08:00 local (UTC+3 in June) = 05:00Z, well after alot, before chatzot.
    expect(currentPrayerWindow(31.7767, 35.2345, new Date("2026-06-15T05:00:00Z"))).toBe(
      "shacharit",
    );
  });

  it("returns mincha for Jerusalem mid-afternoon", () => {
    // ~16:00 local = 13:00Z.
    expect(currentPrayerWindow(31.7767, 35.2345, new Date("2026-06-15T13:00:00Z"))).toBe("mincha");
  });

  it("returns maariv for Jerusalem late night", () => {
    // ~23:00 local = 20:00Z.
    expect(currentPrayerWindow(31.7767, 35.2345, new Date("2026-06-15T20:00:00Z"))).toBe("maariv");
  });

  it("returns shacharit for New York mid-morning (Western hemisphere)", () => {
    // New York ~09:00 local (UTC-4 in June) = 13:00Z.
    expect(currentPrayerWindow(40.7128, -74.006, new Date("2026-06-15T13:00:00Z"))).toBe(
      "shacharit",
    );
  });
});

describe("currentPrayerWindow — UTC-offset wraparound (east of ~+90°)", () => {
  it("does not misfire for Auckland (UTC+12) mid-morning", () => {
    // Auckland ~09:00 local (UTC+12 in June, southern winter) = 21:00Z the
    // previous day. crossingTimesUtcMin's solar-noon formula (720 - 4*lng -
    // eqtime) falls well outside [0,1440) at this longitude (~174.7°E),
    // which is exactly the case normalizeNear exists to handle.
    const result = currentPrayerWindow(-36.8485, 174.7633, new Date("2026-06-14T21:00:00Z"));
    // Southern-hemisphere June: winter sunrise ~07:30 local, so 09:00 local
    // is after alot hashachar but well before the ~12:20 solar noon.
    expect(result).toBe("shacharit");
  });

  it("does not misfire for Beijing (UTC+8) mid-morning", () => {
    // Beijing ~09:00 local = 01:00Z same day.
    const result = currentPrayerWindow(39.9042, 116.4074, new Date("2026-06-15T01:00:00Z"));
    expect(result).toBe("shacharit");
  });

  it("does not misfire for Beijing late evening", () => {
    // Beijing ~22:00 local = 14:00Z same day.
    const result = currentPrayerWindow(39.9042, 116.4074, new Date("2026-06-15T14:00:00Z"));
    expect(result).toBe("maariv");
  });
});

describe("currentPrayerWindow — extreme latitude fallback", () => {
  it("falls back to isDaytime-based shacharit/maariv split for Reykjavik in midsummer", () => {
    // Reykjavik (64.13N) in June: sun never dips below -16.1°, so `alot`
    // crossing times don't resolve and the function falls back to the
    // isDaytime() day/night split rather than throwing or returning garbage.
    const result = currentPrayerWindow(64.1466, -21.9426, new Date("2026-06-15T12:00:00Z"));
    expect(["shacharit", "maariv"]).toContain(result);
  });
});
