import type { MinyanRow } from "@/hooks/use-minyanim";

/** ±30 min around scheduled_at — when a planned minyan also shows on the live map/list. */
export const SCHEDULED_MAP_WINDOW_MS = 30 * 60 * 1000;

/** Street always; scheduled only inside the live window around start. Stay never. */
export function isLiveOnMap(
  m: Pick<MinyanRow, "type" | "scheduled_at">,
  nowMs = Date.now(),
): boolean {
  if (m.type === "street") return true;
  if (m.type !== "scheduled" || !m.scheduled_at) return false;
  const start = new Date(m.scheduled_at).getTime();
  if (Number.isNaN(start)) return false;
  return Math.abs(start - nowMs) <= SCHEDULED_MAP_WINDOW_MS;
}
