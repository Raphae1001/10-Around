/**
 * App-start push registration for already-authenticated sessions (returning
 * users, re-logins) — separate from the one-shot onboarding primer flow in
 * auth.tsx, which keeps working unchanged via its own registerPushNotifications
 * call. Both paths share the same idempotent native listeners (src/lib/native.ts),
 * so calling from two places never creates duplicate listeners; worst case on
 * a brand-new signup is one harmless extra register() call + a same-value
 * upsert.
 */
import { supabase } from "@/integrations/supabase/client";
import { registerPushNotifications, unregisterPushTokenSubscriber, isNative } from "@/lib/native";

async function upsertPushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase.from("user_push_tokens").upsert({ user_id: userId, token });
  if (error) {
    console.error("[Push] Supabase token upsert failed:", error.message);
  } else {
    console.log("[Push] Token upserted to Supabase for current user");
  }
}

// Guards against re-requesting permission/register on every re-render —
// only actually registers once per distinct user id per app session. The
// underlying native 'registration' listener stays attached regardless, so a
// spontaneous token refresh from iOS still reaches upsertPushToken (see
// ensurePushListeners in native.ts) even though this guard blocks a repeat
// register() call for the same user.
let lastSyncedUserId: string | null = null;
let lastSubscriber: ((token: string) => void) | null = null;

/** Call once an authenticated session is known (any account type, incl. guest). */
export async function syncPushRegistration(userId: string): Promise<void> {
  if (!isNative()) return;
  if (lastSyncedUserId === userId) return;
  // Switching accounts within one running app session — drop the previous
  // user's subscriber so their closure doesn't keep firing (and writing to
  // the wrong user's row) after a token refresh.
  if (lastSubscriber) unregisterPushTokenSubscriber(lastSubscriber);
  lastSyncedUserId = userId;
  const subscriber = (token: string) => void upsertPushToken(userId, token);
  lastSubscriber = subscriber;
  await registerPushNotifications(subscriber);
}
