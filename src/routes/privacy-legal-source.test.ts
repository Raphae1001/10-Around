import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRIVACY_LEGAL_SECTIONS } from "@/lib/legal-content";

// Regression guard for Étape 12: privacy.tsx must not reintroduce its own
// local copy of the legal section text — PRIVACY_LEGAL_SECTIONS in
// legal-content.ts is the single source of truth (also used by
// LegalDocSheet.tsx).

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf-8");
}

describe("privacy legal content source parity", () => {
  it("privacy.tsx imports PRIVACY_LEGAL_SECTIONS from legal-content.ts", () => {
    const src = read("./privacy.tsx");
    expect(src).toMatch(/PRIVACY_LEGAL_SECTIONS/);
    expect(src).toMatch(/from "@\/lib\/legal-content"/);
  });

  it("privacy.tsx no longer declares its own LEGAL_SECTIONS array", () => {
    const src = read("./privacy.tsx");
    expect(src).not.toMatch(/const LEGAL_SECTIONS/);
  });

  it("renders every centralized section title somewhere in privacy.tsx's source (icon lookup stays in sync)", () => {
    const src = read("./privacy.tsx");
    for (const section of PRIVACY_LEGAL_SECTIONS) {
      expect(src).toContain(section.title);
    }
  });
});
