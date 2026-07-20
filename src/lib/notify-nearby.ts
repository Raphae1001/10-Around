import { supabase } from "@/integrations/supabase/client";

/** Fire-and-forget: notify opted-in users within ~1 km of a new minyan. */
export function notifyNearbyMinyan(minyanId: string) {
  void supabase.functions
    .invoke("notify-nearby-minyan", { body: { minyan_id: minyanId } })
    .then(({ error }) => {
      if (error) console.warn("notify-nearby-minyan failed", error);
    });
}
