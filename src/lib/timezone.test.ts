import { describe, expect, it } from "vitest";
import { timezoneForCoords, zonedTimeToUtc } from "@/lib/timezone";

describe("timezoneForCoords", () => {
  it("resolves Jerusalem", () => {
    expect(timezoneForCoords(31.7767, 35.2345)).toBe("Asia/Jerusalem");
  });

  it("resolves New York", () => {
    expect(timezoneForCoords(40.7128, -74.006)).toBe("America/New_York");
  });
});

describe("zonedTimeToUtc", () => {
  it("converts a Jerusalem summer wall-clock time (UTC+3, DST) to the correct UTC instant", () => {
    const utc = zonedTimeToUtc("2026-06-15T14:00", "Asia/Jerusalem");
    expect(utc.toISOString()).toBe("2026-06-15T11:00:00.000Z");
  });

  it("converts a Jerusalem winter wall-clock time (UTC+2, standard time) to the correct UTC instant", () => {
    const utc = zonedTimeToUtc("2026-01-15T14:00", "Asia/Jerusalem");
    expect(utc.toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });

  it("converts a New York wall-clock time (UTC-4, DST) to the correct UTC instant", () => {
    const utc = zonedTimeToUtc("2026-06-15T09:00", "America/New_York");
    expect(utc.toISOString()).toBe("2026-06-15T13:00:00.000Z");
  });

  it("handles a wall-clock time right after a DST spring-forward transition", () => {
    // US DST began 2026-03-08 at 02:00 local (clocks jump to 03:00). A wall
    // time shortly after should resolve to UTC-4 (EDT), not UTC-5 (EST).
    const utc = zonedTimeToUtc("2026-03-08T09:00", "America/New_York");
    expect(utc.toISOString()).toBe("2026-03-08T13:00:00.000Z");
  });

  it("is independent of the host's own local timezone", () => {
    // Regression guard: this must not depend on process.env.TZ / device tz.
    // Jerusalem 14:00 (UTC+3 in June) and New York 07:00 (UTC-4 in June) are
    // the same instant (11:00Z).
    const a = zonedTimeToUtc("2026-06-15T14:00", "Asia/Jerusalem");
    const b = zonedTimeToUtc("2026-06-15T07:00", "America/New_York");
    expect(a.getTime()).toBe(b.getTime());
  });
});
