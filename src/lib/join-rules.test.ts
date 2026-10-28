import { describe, expect, it } from "vitest";
import { findJoinConflict, isJoinSpacingError, type Registration } from "@/lib/join-rules";

const base = new Date("2026-10-28T18:00:00Z").getTime();
const reg = (minutesFromBase: number, id = "a"): Registration => ({
  minyan_id: id,
  start_at: new Date(base + minutesFromBase * 60_000).toISOString(),
  address: "Somewhere",
});

describe("findJoinConflict", () => {
  it("blocks a minyan starting less than 30 minutes away", () => {
    expect(findJoinConflict([reg(0)], "b", base + 20 * 60_000)).not.toBeNull();
    expect(findJoinConflict([reg(0)], "b", base - 29 * 60_000)).not.toBeNull();
  });

  it("allows exactly 30 minutes or more", () => {
    expect(findJoinConflict([reg(0)], "b", base + 30 * 60_000)).toBeNull();
    expect(findJoinConflict([reg(0)], "b", base + 3 * 60 * 60_000)).toBeNull();
  });

  it("ignores the minyan itself and handles no registration", () => {
    expect(findJoinConflict([reg(0, "a")], "a", base)).toBeNull();
    expect(findJoinConflict([], "a", base)).toBeNull();
  });

  it("returns the clashing registration", () => {
    const clash = findJoinConflict([reg(240, "far"), reg(10, "near")], "x", base);
    expect(clash?.minyan_id).toBe("near");
  });
});

describe("isJoinSpacingError", () => {
  it("recognises the database error", () => {
    expect(isJoinSpacingError("already_joined_nearby_time")).toBe(true);
    expect(isJoinSpacingError("duplicate key")).toBe(false);
    expect(isJoinSpacingError(undefined)).toBe(false);
  });
});
