// Deletes the authenticated user's account.
// Called from the Capacitor SPA (no TanStack server runtime) via
// supabase.functions.invoke('delete-account').
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON =
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: ures, error: uerr } = await userClient.auth.getUser();
    if (uerr || !ures.user) {
      // Idempotent: a double-tap on Sign out/Delete, or a retry after the
      // account was already removed, means there's nothing left to delete —
      // an invalid/expired token here IS the desired end state, not a failure.
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Explicit cleanup before auth delete (CASCADE also covers profiles).
    const uid = ures.user.id;

    // travel_city chat_threads have no minyan_id, so they don't cascade from
    // the minyanim delete below like minyan-kind threads do — capture which
    // ones this user belongs to now, before their membership row is gone, so
    // we can prune any left with zero members after cleanup.
    const { data: myThreadRows } = await admin
      .from("chat_thread_members")
      .select("thread_id")
      .eq("user_id", uid);
    const myThreadIds = (myThreadRows ?? []).map((r) => r.thread_id as string);

    await admin.from("member_presence").delete().eq("user_id", uid);
    await admin.from("user_push_tokens").delete().eq("user_id", uid);
    await admin.from("travel_presence").delete().eq("user_id", uid);
    await admin.from("minyan_participants").delete().eq("user_id", uid);
    await admin.from("minyan_confirmations").delete().eq("user_id", uid);
    await admin.from("chat_thread_members").delete().eq("user_id", uid);
    await admin.from("chat_messages").delete().eq("user_id", uid);
    await admin.from("content_reports").delete().eq("reporter_id", uid);
    await admin.from("content_reports").delete().eq("reported_user_id", uid);
    await admin.from("minyanim").delete().eq("creator_id", uid);

    // A travel_city thread this user was the last member of is now orphaned
    // (0 members, no minyan_id to have cascaded it) — prune it. A thread
    // shared with other travelers still has members and is left alone.
    for (const threadId of myThreadIds) {
      const { count } = await admin
        .from("chat_thread_members")
        .select("user_id", { count: "exact", head: true })
        .eq("thread_id", threadId);
      if (!count) {
        await admin.from("chat_threads").delete().eq("id", threadId).eq("kind", "travel_city");
      }
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
