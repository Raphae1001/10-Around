import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Regression guard for Étape 10: create.tsx and create-scheduled.tsx must
// both preselect the prayer window from the same, more precise source
// (zmanim.ts's real halachic zmanim), not the rough solar-angle estimate
// in sun.ts. A future edit that reintroduces sun.ts in only one of the two
// screens should fail this test rather than silently drift.

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf-8");
}

describe("prayer preselection source parity", () => {
  it("create.tsx uses currentPrayerWindowZmanim from zmanim.ts", () => {
    const src = read("./create.tsx");
    expect(src).toMatch(/currentPrayerWindowZmanim/);
    expect(src).toMatch(/from "@\/lib\/zmanim"/);
  });

  it("create-scheduled.tsx uses currentPrayerWindowZmanim from zmanim.ts, not sun.ts", () => {
    const src = read("./create-scheduled.tsx");
    expect(src).toMatch(/currentPrayerWindowZmanim/);
    expect(src).toMatch(/from "@\/lib\/zmanim"/);
    expect(src).not.toMatch(/from "@\/lib\/sun"/);
  });
});
