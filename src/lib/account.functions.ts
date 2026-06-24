/**
 * Account deletion server function.
 *
 * Apple App Review 5.1.1(v) and Google Play Account Deletion policy
 * require users to be able to delete their account and data from inside
 * the app. This function performs a hard delete of the auth user, which
 * cascades to every public.* table via ON DELETE CASCADE on the FK to
 * auth.users(id) (audited 2026-06-24).
 *
 * Tables affected via cascade:
 *   - profiles                  (creator)
 *   - minyanim                  (creator_id)
 *   - minyan_participants       (user_id)
 *   - minyan_confirmations      (FK to minyanim, cascades)
 *   - travel_presence           (user_id)
 *   - user_push_tokens          (user_id)
 *   - chat_thread_members       (user_id)
 *   - chat_messages             (user_id)
 *   - chat_threads              (cascades from minyanim where creator)
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    if (!userId) throw new Error("Not authenticated");

    // Load admin client inside the handler — route/function modules ship
    // to the client bundle; only handler bodies are stripped.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      throw new Error(`Failed to delete account: ${error.message}`);
    }

    return { ok: true as const };
  });
