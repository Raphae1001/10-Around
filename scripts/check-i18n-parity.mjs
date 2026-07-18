#!/usr/bin/env node
/**
 * Fails if any locale is missing keys present in en.json.
 * Usage: node scripts/check-i18n-parity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../src/i18n/locales");

function flat(o, p = "", out = {}) {
  for (const [k, v] of Object.entries(o)) {
    const nk = p ? `${p}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flat(v, nk, out);
    else out[nk] = v;
  }
  return out;
}

const en = JSON.parse(fs.readFileSync(path.join(localesDir, "en.json"), "utf8"));
const enF = flat(en);
let failed = false;

for (const file of fs.readdirSync(localesDir).filter((f) => f.endsWith(".json"))) {
  const miss = Object.keys(enF).filter(
    (k) => !(k in flat(JSON.parse(fs.readFileSync(path.join(localesDir, file), "utf8")))),
  );
  if (miss.length) {
    failed = true;
    console.error(`${file}: missing ${miss.length}`);
    console.error(miss.slice(0, 20).join("\n"));
  } else {
    console.log(`${file}: OK`);
  }
}

if (failed) process.exit(1);
