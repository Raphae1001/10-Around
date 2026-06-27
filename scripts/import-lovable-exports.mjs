/**
 * Import Lovable Cloud CSV exports into the new Supabase project.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
 *   SUPABASE_DB_PASSWORD='your-db-password' \
 *   node scripts/import-lovable-exports.mjs
 *
 * SUPABASE_DB_PASSWORD is required for auth.users + auth.identities (direct SQL).
 * Public tables are imported via the service-role REST client.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXPORTS = path.join(ROOT, "exports");

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://jyqregdkmufrxyugrxrp.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "jyqregdkmufrxyugrxrp";

if (!SERVICE_ROLE) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Parse Lovable semicolon CSV with quoted JSON fields. */
function parseSemicolonCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ";") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
}

function readCsv(fileName) {
  const filePath = path.join(EXPORTS, fileName);
  if (!fs.existsSync(filePath)) {
    const alt = fs.readdirSync(EXPORTS).find((f) => f.startsWith(fileName.replace(".csv", "")));
    if (!alt) return [];
    return readCsv(alt);
  }
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];
  const table = parseSemicolonCsv(raw);
  const headers = table[0];
  return table.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    return obj;
  });
}

function findExport(prefix) {
  const exact = path.join(EXPORTS, `${prefix}.csv`);
  if (fs.existsSync(exact)) return `${prefix}.csv`;
  const match = fs
    .readdirSync(EXPORTS)
    .filter((f) => f.endsWith(".csv"))
    .find((f) => f.startsWith(prefix));
  return match ?? null;
}

function readExportByPrefix(prefix) {
  const file = findExport(prefix);
  if (!file) return [];
  return readCsv(file);
}

function parseJson(value) {
  if (!value || value === "{}") return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function sqlValue(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  if (!value || value === "") return "'{}'::jsonb";
  return `'${String(value).replace(/'/g, "''")}'::jsonb`;
}

function sqlBool(value) {
  if (value === "" || value === null || value === undefined) return "false";
  return String(value).toLowerCase() === "true" ? "true" : "false";
}

async function importAuthViaAdmin() {
  const users = readExportByPrefix("query-results-export-2026-06-27_23-26-43");
  let ok = 0;
  for (const u of users) {
    const payload = {
      id: u.id,
      user_metadata: parseJson(u.raw_user_meta_data),
      app_metadata: parseJson(u.raw_app_meta_data),
      email_confirm: Boolean(u.email_confirmed_at || u.confirmed_at),
    };
    if (u.email) {
      payload.email = u.email;
    } else {
      // Anonymous test users from simulator — placeholder email required by Admin API.
      payload.email = `anon+${u.id}@minyannow.import`;
      payload.email_confirm = true;
    }
    const { error } = await supabase.auth.admin.createUser(payload);
    if (error && !/already|exists|duplicate/i.test(error.message)) {
      throw new Error(`createUser ${u.id}: ${error.message}`);
    }
    ok++;
  }
  console.log(`Auth import (admin API): ${ok} users (identities still need DB password)`);
}

async function importAuthViaPg() {
  if (!DB_PASSWORD) {
    throw new Error("SUPABASE_DB_PASSWORD is required for auth import");
  }

  const users = readExportByPrefix("query-results-export-2026-06-27_23-26-43");
  const identities = readExportByPrefix("query-results-export-2026-06-27_23-27-08");

  const pool = new pg.Pool({
    connectionString: `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const u of users) {
      await client.query(
        `
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
          recovery_token, recovery_sent_at, email_change_token_new, email_change,
          email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
          is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
          phone_change, phone_change_token, phone_change_sent_at,
          email_change_token_current, email_change_confirm_status, banned_until,
          reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at,
          is_anonymous
        ) VALUES (
          $1::uuid, $2::uuid, $3, $4, NULLIF($5, ''), NULLIF($6, ''),
          NULLIF($7, '')::timestamptz, NULLIF($8, '')::timestamptz,
          COALESCE(NULLIF($9, ''), ''), NULLIF($10, '')::timestamptz,
          COALESCE(NULLIF($11, ''), ''), NULLIF($12, '')::timestamptz,
          COALESCE(NULLIF($13, ''), ''), NULLIF($14, ''),
          NULLIF($15, '')::timestamptz, NULLIF($16, '')::timestamptz,
          $17::jsonb, $18::jsonb,
          $19::boolean, $20::timestamptz, $21::timestamptz,
          NULLIF($22, ''), NULLIF($23, '')::timestamptz,
          NULLIF($24, ''), COALESCE(NULLIF($25, ''), ''),
          NULLIF($26, '')::timestamptz,
          COALESCE(NULLIF($27, ''), ''), COALESCE(NULLIF($28, ''), '0')::smallint,
          NULLIF($29, '')::timestamptz,
          COALESCE(NULLIF($30, ''), ''), NULLIF($31, '')::timestamptz,
          $32::boolean, NULLIF($33, '')::timestamptz,
          $34::boolean
        )
        ON CONFLICT (id) DO NOTHING
        `,
        [
          u.instance_id || "00000000-0000-0000-0000-000000000000",
          u.id,
          u.aud || "authenticated",
          u.role || "authenticated",
          u.email ?? "",
          u.encrypted_password ?? "",
          u.email_confirmed_at ?? u.confirmed_at ?? "",
          u.invited_at ?? "",
          u.confirmation_token ?? "",
          u.confirmation_sent_at ?? "",
          u.recovery_token ?? "",
          u.recovery_sent_at ?? "",
          u.email_change_token_new ?? "",
          u.email_change ?? "",
          u.email_change_sent_at ?? "",
          u.last_sign_in_at ?? "",
          u.raw_app_meta_data || "{}",
          u.raw_user_meta_data || "{}",
          u.is_super_admin ?? "false",
          u.created_at,
          u.updated_at,
          u.phone ?? "",
          u.phone_confirmed_at ?? "",
          u.phone_change ?? "",
          u.phone_change_token ?? "",
          u.phone_change_sent_at ?? "",
          u.email_change_token_current ?? "",
          u.email_change_confirm_status ?? "0",
          u.banned_until ?? "",
          u.reauthentication_token ?? "",
          u.reauthentication_sent_at ?? "",
          u.is_sso_user ?? "false",
          u.deleted_at ?? "",
          u.is_anonymous ?? "false",
        ],
      );
    }

    for (const idn of identities) {
      await client.query(
        `
        INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id,
          last_sign_in_at, created_at, updated_at
        ) VALUES (
          $1::uuid, $2::uuid, $3::jsonb, $4, $5,
          NULLIF($6, '')::timestamptz, $7::timestamptz, $8::timestamptz
        )
        ON CONFLICT (id) DO NOTHING
        `,
        [
          idn.id,
          idn.user_id,
          idn.identity_data || "{}",
          idn.provider,
          idn.provider_id,
          idn.last_sign_in_at ?? "",
          idn.created_at,
          idn.updated_at,
        ],
      );
    }

    await client.query("COMMIT");
    console.log(`Auth import OK: ${users.length} users, ${identities.length} identities`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function upsertTable(table, rows, { onConflict = "id" } = {}) {
  if (!rows.length) {
    console.log(`Skip ${table}: no rows`);
    return 0;
  }

  const cleaned = rows.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (v === "") out[k] = null;
      else if (v === "true") out[k] = true;
      else if (v === "false") out[k] = false;
      else out[k] = v;
    }
    return out;
  });

  const { error } = await supabase.from(table).upsert(cleaned, { onConflict });
  if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  console.log(`Imported ${table}: ${cleaned.length} rows`);
  return cleaned.length;
}

async function countTable(table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`Count ${table} failed: ${error.message}`);
  return count ?? 0;
}

async function main() {
  console.log("=== MinyanNow Lovable → Supabase import ===\n");

  if (DB_PASSWORD) {
    await importAuthViaPg();
  } else {
    console.warn("WARN: SUPABASE_DB_PASSWORD not set — using admin API for users only");
    await importAuthViaAdmin();
  }

  const tableFiles = [
    ["profiles", "profiles-export", "id"],
    ["chat_threads", "chat_threads-export", "id"],
    ["chat_thread_members", "chat_thread_members-export", "thread_id,user_id"],
    ["chat_messages", "chat_messages-export", "id"],
    ["travel_presence", "travel_presence-export", "id"],
  ];

  for (const [table, prefix, onConflict] of tableFiles) {
    const rows = readExportByPrefix(prefix);
    if (rows.length) await upsertTable(table, rows, { onConflict });
  }

  console.log("\n=== Verification (destination counts) ===");
  const expected = {
    profiles: 8,
    chat_threads: 4,
    chat_thread_members: 4,
    chat_messages: 1,
    travel_presence: 1,
  };

  for (const [table, exp] of Object.entries(expected)) {
    const got = await countTable(table);
    const ok = got === exp ? "OK" : "MISMATCH";
    console.log(`${table}: ${got} (expected ${exp}) ${ok}`);
  }

  if (DB_PASSWORD) {
    const pool = new pg.Pool({
      connectionString: `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres`,
      ssl: { rejectUnauthorized: false },
    });
    const { rows: userCount } = await pool.query("SELECT count(*)::int AS c FROM auth.users");
    const { rows: idCount } = await pool.query("SELECT count(*)::int AS c FROM auth.identities");
    await pool.end();
    console.log(`auth.users: ${userCount[0].c} (expected 8) ${userCount[0].c === 8 ? "OK" : "MISMATCH"}`);
    console.log(`auth.identities: ${idCount[0].c} (expected 2) ${idCount[0].c === 2 ? "OK" : "MISMATCH"}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
