// Called by pg_net from notify_developer_of_report() when a user reports content or blocks
// someone (App Store Guideline 1.2: blocking must notify the developer). Never called by clients.
//
// Auth: verify_jwt already checks the bearer token; we additionally require role = service_role.
// Delivery: email through Resend. Needs RESEND_API_KEY and MODERATION_EMAIL_TO secrets
// (optional MODERATION_EMAIL_FROM). Without them the report is still stored in
// public.content_reports (status = 'open') and the function just logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

function jwtRole(req: Request): string | null {
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (jwtRole(req) !== "service_role") return new Response("Forbidden", { status: 403 });

  const { report_id } = await req.json().catch(() => ({}));
  if (!report_id) return new Response("Missing report_id", { status: 400 });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: r, error } = await admin
    .from("content_reports")
    .select("*")
    .eq("id", report_id)
    .single();
  if (error || !r) return new Response("Report not found", { status: 404 });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("MODERATION_EMAIL_TO");
  if (!apiKey || !to) {
    console.log("notify-report: email not configured, report stored only", report_id);
    return new Response(JSON.stringify({ stored: true, emailed: false }), { status: 200 });
  }

  const subject = `[10 Around] ${r.target_type === "user" && r.reason === "blocked_user" ? "User blocked" : "Content reported"} (${r.reason})`;
  const html = `
    <h3>${esc(subject)}</h3>
    <ul>
      <li>Report id: ${esc(r.id)}</li>
      <li>Type: ${esc(r.target_type)} — reason: ${esc(r.reason)}</li>
      <li>Reporter: ${esc(r.reporter_id)}</li>
      <li>Reported user: ${esc(r.reported_user_id)}</li>
      <li>Message id: ${esc(r.message_id)} / Minyan id: ${esc(r.minyan_id)}</li>
      <li>Details: ${esc(r.details)}</li>
      <li>Snapshot: ${esc(r.message_snapshot)}</li>
    </ul>
    <p>Review within 24 hours: remove the content and/or delete the offending account, then set status to 'actioned'.</p>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("MODERATION_EMAIL_FROM") ?? "10 Around <onboarding@resend.dev>",
      to: to.split(",").map((s) => s.trim()),
      subject,
      html,
    }),
  });
  if (!resp.ok) console.error("notify-report: Resend error", resp.status, await resp.text());
  return new Response(JSON.stringify({ stored: true, emailed: resp.ok }), { status: 200 });
});
