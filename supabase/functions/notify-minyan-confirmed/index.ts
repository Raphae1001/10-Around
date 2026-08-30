// Called by pg_net from check_minyan_confirmation() / creator_decide_minyan()
// (never by a client) when a street minyan transitions into the 10-minute
// arrival window, or when the creator needs to decide whether there's a
// minyan after the original deadline passed without 10 confirmed.
//
// Auth: the platform's verify_jwt gate already checks the bearer token is a
// validly-signed JWT for this project; we additionally require its `role`
// claim to be "service_role" so only our own cron (via pg_net, using the
// key stored in Supabase Vault) can reach this — never end users.
//
// Delivery: direct-to-APNs, same approach as notify-nearby-minyan. Requires
// APNS_KEY_ID, APNS_TEAM_ID, APNS_AUTH_KEY Edge Function secrets; without
// them, notifications are queued (logged) but not delivered.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Kind = "arriving" | "creator_decision";
type Recipient = { user_id: string; token: string };

const APNS_TOKEN_RE = /^[0-9a-fA-F]{64,200}$/;

// Bounded worker pool: at most `limit` calls to `fn` in flight at once,
// instead of either fully sequential (slow: N round trips end to end) or an
// unbounded Promise.all (risks a burst of N simultaneous APNs requests).
// Results are returned in the same order as `items`, regardless of which
// finishes first. `fn` must not throw for a single item to abort the rest —
// the call site below wraps its own risky work in try/catch accordingly.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Recipients here are naturally small (a single minyan's participants, or
// exactly the creator) compared to notify-nearby-minyan's radius-based fan
// out, but the same bounded pool keeps latency down without ever bursting
// unbounded concurrent APNs requests.
const PUSH_CONCURRENCY = 5;

let cachedKey: CryptoKey | null = null;
let cachedJwt: { token: string; issuedAt: number } | null = null;

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importApnsKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
  ]);
}

async function getApnsJwt(keyId: string, teamId: string, authKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now - cachedJwt.issuedAt < 45 * 60) return cachedJwt.token;
  if (!cachedKey) cachedKey = await importApnsKey(authKeyPem);

  const header = { alg: "ES256", kid: keyId };
  const payload = { iss: teamId, iat: now };
  const enc = new TextEncoder();
  const signingInput =
    base64url(enc.encode(JSON.stringify(header))) +
    "." +
    base64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cachedKey,
    enc.encode(signingInput),
  );
  const jwt = `${signingInput}.${base64url(new Uint8Array(sig))}`;
  cachedJwt = { token: jwt, issuedAt: now };
  return jwt;
}

async function sendApns(
  token: string,
  payload: { title: string; body: string; minyanId: string; kind: Kind },
  env: { keyId: string; teamId: string; authKeyPem: string; topic: string; host: string },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const jwt = await getApnsJwt(env.keyId, env.teamId, env.authKeyPem);
  const res = await fetch(`https://${env.host}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": env.topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      aps: { alert: { title: payload.title, body: payload.body }, sound: "default" },
      minyan_id: payload.minyanId,
      type: payload.kind === "arriving" ? "minyan_confirmed_arriving" : "minyan_needs_decision",
    }),
  });
  if (res.status === 200) return { ok: true };
  const text = await res.text().catch(() => "");
  return { ok: false, reason: `${res.status}: ${text.slice(0, 160)}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (jwtRole(authHeader) !== "service_role") {
      return json({ error: "Unauthorized" }, 401);
    }

    const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID") ?? "";
    const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID") ?? "";
    const APNS_AUTH_KEY = Deno.env.get("APNS_AUTH_KEY") ?? "";
    const APNS_TOPIC = Deno.env.get("APNS_TOPIC") || "com.raphaelkalfon.minyannow";
    const APNS_HOST =
      (Deno.env.get("APNS_ENV") ?? "production") === "sandbox"
        ? "api.sandbox.push.apple.com"
        : "api.push.apple.com";
    const apnsConfigured = Boolean(APNS_KEY_ID && APNS_TEAM_ID && APNS_AUTH_KEY);

    const body = await req.json().catch(() => ({}));
    const minyanId = body?.minyan_id as string | undefined;
    const kind = body?.kind as Kind | undefined;
    if (!minyanId || (kind !== "arriving" && kind !== "creator_decision")) {
      return json({ error: "minyan_id and kind ('arriving'|'creator_decision') required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: minyan, error: mErr } = await admin
      .from("minyanim")
      .select("id, creator_id, prayer, address")
      .eq("id", minyanId)
      .maybeSingle();
    if (mErr || !minyan) return json({ error: mErr?.message ?? "Minyan not found" }, 404);

    const prayerLabel =
      String(minyan.prayer ?? "minyan")
        .charAt(0)
        .toUpperCase() + String(minyan.prayer ?? "minyan").slice(1);
    const place = minyan.address ?? "the meeting point";

    let title: string;
    let bodyText: string;
    let notifKind: "minyan_confirmed_arriving" | "minyan_needs_decision";
    let notifyUserIds: string[];

    if (kind === "arriving") {
      title = "Minyan confirmed!";
      bodyText = `${prayerLabel} starting soon — meet at ${place}.`;
      notifKind = "minyan_confirmed_arriving";
      const { data: parts } = await admin
        .from("minyan_participants")
        .select("user_id")
        .eq("minyan_id", minyanId);
      notifyUserIds = (parts ?? []).map((p) => p.user_id as string);
    } else {
      title = "Minyan not confirmed yet";
      bodyText = `Not enough people yet for ${prayerLabel} at ${place} — is there a minyan?`;
      notifKind = "minyan_needs_decision";
      notifyUserIds = [minyan.creator_id as string];
    }

    if (notifyUserIds.length === 0) {
      return json({ ok: true, sent: 0, queued: 0, reason: "no_recipients" });
    }

    // In-app notification for everyone in scope, regardless of push token.
    // ignoreDuplicates (INSERT ... ON CONFLICT DO NOTHING) guards against an
    // overlapping cron tick re-sending the same (user_id, minyan_id, kind)
    // row — see 20260827130000_dedupe_user_notifications.sql.
    await admin.from("user_notifications").upsert(
      notifyUserIds.map((uid) => ({
        user_id: uid,
        minyan_id: minyan.id,
        kind: notifKind,
        data: { prayer: minyan.prayer, address: minyan.address },
      })),
      { onConflict: "user_id,minyan_id,kind", ignoreDuplicates: true },
    );

    const { data: tokenRows } = await admin
      .from("user_push_tokens")
      .select("user_id, token")
      .in("user_id", notifyUserIds);
    const recipients = (tokenRows ?? []) as Recipient[];

    // Delivery to each recipient is fully independent — bounded concurrency
    // instead of one APNs round trip at a time. Each task catches its own
    // errors so one recipient's failure can never abort the rest.
    type DeliveryOutcome =
      { status: "sent" } | { status: "queued" } | { status: "skipped"; reason: string };

    const outcomes = await mapWithConcurrency(
      recipients,
      PUSH_CONCURRENCY,
      async (r): Promise<DeliveryOutcome> => {
        try {
          const isApns = APNS_TOKEN_RE.test(r.token);
          if (isApns && apnsConfigured) {
            const result = await sendApns(
              r.token,
              { title, body: bodyText, minyanId: minyan.id, kind },
              {
                keyId: APNS_KEY_ID,
                teamId: APNS_TEAM_ID,
                authKeyPem: APNS_AUTH_KEY,
                topic: APNS_TOPIC,
                host: APNS_HOST,
              },
            );
            if (result.ok) return { status: "sent" };
            return { status: "skipped", reason: result.reason };
          }
          return { status: "queued" };
        } catch (e) {
          return { status: "skipped", reason: (e as Error).message };
        }
      },
    );

    let sent = 0;
    let queued = 0;
    let skipped = 0;
    const deliveryErrors: string[] = [];
    for (const outcome of outcomes) {
      if (outcome.status === "sent") sent += 1;
      else if (outcome.status === "queued") queued += 1;
      else {
        skipped += 1;
        deliveryErrors.push(outcome.reason);
      }
    }

    return json({
      ok: true,
      sent,
      queued,
      skipped,
      warning: apnsConfigured ? undefined : "APNS secrets not set — pushes queued, not delivered",
      errors: deliveryErrors.slice(0, 5),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function jwtRole(bearerHeader: string): string | null {
  const token = bearerHeader.replace(/^Bearer\s+/i, "");
  const payloadSeg = token.split(".")[1];
  if (!payloadSeg) return null;
  try {
    const b64 = payloadSeg.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")));
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
