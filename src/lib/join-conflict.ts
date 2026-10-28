import { supabase } from "@/integrations/supabase/client";
import { findJoinConflict, type Registration } from "@/lib/join-rules";

/** Is the signed-in user already registered to a minyan starting within 30 minutes of `startMs`? */
export async function fetchJoinConflict(startMs: number): Promise<Registration | null> {
  const { data } = await supabase.rpc("my_active_registrations");
  return findJoinConflict(data ?? [], null, startMs);
}

export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
