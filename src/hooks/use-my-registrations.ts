import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Registration } from "@/lib/join-rules";

/** The minyanim the signed-in user is currently registered to (not finished). */
export function useMyRegistrations(userId?: string) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRegistrations([]);
      return [] as Registration[];
    }
    const { data } = await supabase.rpc("my_active_registrations");
    const rows = data ?? [];
    setRegistrations(rows);
    return rows;
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { registrations, refresh };
}
