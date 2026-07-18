import type { MinyanRow } from "@/hooks/use-minyanim";

/**
 * Street: always on the live map while returned by nearby_minyanim.
 * Scheduled: on the map from creation at the chosen location (nearby radius),
 * until expires — not only in a ±30 min window.
 * Stay: never on the live map.
 */
export function isLiveOnMap(m: Pick<MinyanRow, "type" | "scheduled_at">): boolean {
  if (m.type === "street") return true;
  if (m.type === "scheduled" && m.scheduled_at) return true;
  return false;
}
