import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BlockedUser = {
  blocked_id: string;
  blocked_name: string | null;
  created_at: string;
};

const CHANGED_EVENT = "blocked-users-changed";

/** The users the signed-in user has blocked. Shared across screens through a window event. */
export function useBlockedUsers(userId?: string) {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);

  const load = useCallback(async () => {
    if (!userId) {
      setBlocked([]);
      return;
    }
    const { data } = await supabase
      .from("user_blocks")
      .select("blocked_id, blocked_name, created_at")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });
    setBlocked(data ?? []);
  }, [userId]);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener(CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CHANGED_EVENT, onChange);
  }, [load]);

  const block = useCallback(
    async (blockedId: string, name: string | null) => {
      if (!userId || blockedId === userId) return { error: null };
      const { error } = await supabase
        .from("user_blocks")
        .upsert(
          { blocker_id: userId, blocked_id: blockedId, blocked_name: name },
          { onConflict: "blocker_id,blocked_id" },
        );
      if (!error) window.dispatchEvent(new Event(CHANGED_EVENT));
      return { error };
    },
    [userId],
  );

  const unblock = useCallback(
    async (blockedId: string) => {
      if (!userId) return { error: null };
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", blockedId);
      if (!error) window.dispatchEvent(new Event(CHANGED_EVENT));
      return { error };
    },
    [userId],
  );

  const blockedIds = useMemo(() => new Set(blocked.map((b) => b.blocked_id)), [blocked]);

  return { blocked, blockedIds, block, unblock };
}
