// Notify users who accepted push + have fresh presence within ~1 km of a new minyan.
//
// Delivery:
//   iOS  — tokens from @capacitor/push-notifications are raw APNs device tokens
//          (64+ hex chars). Sent directly to Apple via HTTP/2 + a JWT signed with
//          an APNs Auth Key (.p8). Requires APNS_KEY_ID, APNS_TEAM_ID, APNS_AUTH_KEY
//          (the .p8 file contents) as Edge Function secrets. APNS_TOPIC defaults to
//          the app bundle id; APNS_ENV defaults to "production" (set "sandbox" for
//          Xcode debug / TestFlight-less builds).
//   Android — not wired yet (would need an FCM v1 service account). Recipients with
//          a non-APNs-shaped token are queued (logged, not delivered) until that's added.
//
// With no APNs secrets set, everything is queued (logged) rather than delivered, so
// this function is always safe to call even before Apple credentials exist.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Recipient = { user_id: string; token: string };

const APNS_TOKEN_RE = /^[0-9a-fA-F]{64,200}$/;

// Bounded worker pool: at most `limit` calls to `fn` in flight at once,
// instead of either fully sequential (slow: N round trips end to end) or an
// unbounded Promise.all (risks a burst of N simultaneous APNs/DB requests).
// Results are returned in the same order as `items`, regardless of which
// finishes first. `fn` must not throw for a single item to abort the rest —
// every call site below wraps its own risky work in try/catch accordingly.
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

// Apple has no documented hard per-key concurrency limit, but this keeps the
// in-flight request burst (to APNs and to Postgres) modest and predictable
// regardless of how many recipients a dense area produces.
const PUSH_CONCURRENCY = 5;

// APNs signing key is imported once per warm instance and reused.
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

/** ES256 JWT for APNs provider auth. Apple allows reuse for up to ~1h. */
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
  payload: { title: string; body: string; minyanId: string },
  env: {
    keyId: string;
    teamId: string;
    authKeyPem: string;
    topic: string;
    host: string;
  },
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
      type: "nearby_minyan",
    }),
  });
  if (res.status === 200) return { ok: true };
  const text = await res.text().catch(() => "");
  return { ok: false, reason: `${res.status}: ${text.slice(0, 160)}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing bearer token" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID") ?? "";
    const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID") ?? "";
    const APNS_AUTH_KEY = Deno.env.get("APNS_AUTH_KEY") ?? "";
    const APNS_TOPIC = Deno.env.get("APNS_TOPIC") || "com.raphaelkalfon.minyannow";
    const APNS_HOST =
      (Deno.env.get("APNS_ENV") ?? "production") === "sandbox"
        ? "api.sandbox.push.apple.com"
        : "api.push.apple.com";
    const apnsConfigured = Boolean(APNS_KEY_ID && APNS_TEAM_ID && APNS_AUTH_KEY);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: ures, error: uerr } = await userClient.auth.getUser();
    if (uerr || !ures.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const minyanId = body?.minyan_id as string | undefined;
    if (!minyanId) {
      return json({ error: "minyan_id required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: minyan, error: mErr } = await admin
      .from("minyanim")
      .select("id, creator_id, prayer, address, latitude, longitude, type")
      .eq("id", minyanId)
      .maybeSingle();

    if (mErr || !minyan) {
      return json({ error: mErr?.message ?? "Minyan not found" }, 404);
    }

    // Only the creator (or service) may fan out for this minyan.
    if (minyan.creator_id !== ures.user.id) {
      return json({ error: "Forbidden" }, 403);
    }

    const radius = 1000;
    const { data: recipients, error: rErr } = await admin.rpc("nearby_push_recipients", {
      _lat: minyan.latitude,
      _lng: minyan.longitude,
      _radius_m: radius,
      _exclude_user_id: minyan.creator_id,
    });

    if (rErr) {
      return json({ error: rErr.message }, 500);
    }

    const list = (recipients ?? []) as Recipient[];
    if (list.length === 0) {
      return json({ ok: true, sent: 0, skipped: 0, reason: "no_recipients" });
    }

    // Cap: 3 notifications per person per 6 hours. Independent read per
    // recipient (no ordering dependency between users) — safe to check with
    // bounded concurrency instead of one at a time.
    const notifCap = 3;
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const eligibleFlags = await mapWithConcurrency(list, PUSH_CONCURRENCY, async (r) => {
      try {
        const { count } = await admin
          .from("push_notification_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", r.user_id)
          .gte("created_at", since);
        return (count ?? 0) < notifCap;
      } catch {
        // Can't confirm this user is under the cap — fail closed (skip them)
        // rather than risk over-notifying.
        return false;
      }
    });
    const eligible: Recipient[] = list.filter((_, i) => eligibleFlags[i]);

    const prayerLabel =
      String(minyan.prayer ?? "minyan")
        .charAt(0)
        .toUpperCase() + String(minyan.prayer ?? "minyan").slice(1);
    const title = "Minyan nearby";
    const bodyText = `${prayerLabel} — ${minyan.address ?? "around you"}`;

    // Delivery to each recipient is fully independent — no relative ordering
    // between different users matters — so this also runs with bounded
    // concurrency instead of one APNs round trip at a time. Each task
    // catches its own errors so one recipient's failure can never abort the
    // rest (mapWithConcurrency's Promise.all would otherwise reject as a
    // whole on the first uncaught rejection).
    type DeliveryOutcome =
      { status: "sent" } | { status: "queued" } | { status: "skipped"; reason: string };

    const outcomes = await mapWithConcurrency(
      eligible,
      PUSH_CONCURRENCY,
      async (r): Promise<DeliveryOutcome> => {
        try {
          const isApns = APNS_TOKEN_RE.test(r.token);

          if (isApns && apnsConfigured) {
            const result = await sendApns(
              r.token,
              { title, body: bodyText, minyanId: minyan.id },
              {
                keyId: APNS_KEY_ID,
                teamId: APNS_TEAM_ID,
                authKeyPem: APNS_AUTH_KEY,
                topic: APNS_TOPIC,
                host: APNS_HOST,
              },
            );
            if (result.ok) {
              await admin.from("push_notification_log").insert({
                user_id: r.user_id,
                minyan_id: minyan.id,
                kind: "nearby_minyan",
              });
              return { status: "sent" };
            }
            return { status: "skipped", reason: result.reason };
          }

          // Not an APNs token, or APNs not configured yet — record intent
          // without claiming delivery (mirrors the pre-APNs "queued" behaviour).
          await admin.from("push_notification_log").insert({
            user_id: r.user_id,
            minyan_id: minyan.id,
            kind: "nearby_minyan_queued",
          });
          return { status: "queued" };
        } catch (e) {
          return { status: "skipped", reason: (e as Error).message };
        }
      },
    );

    let sent = 0;
    let queued = 0;
    let skipped = list.length - eligible.length;
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
      warning: apnsConfigured
        ? undefined
        : "APNS secrets not set — iOS pushes queued, not delivered",
      errors: deliveryErrors.slice(0, 5),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
