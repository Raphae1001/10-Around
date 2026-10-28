import type { MinyanRow } from "@/hooks/use-minyanim";
import { distanceMeters } from "@/lib/geo";

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

/** "Minyanim near you" = within this radius of the user... */
export const NEARBY_RADIUS_M = 1000;
/** ...and live now or starting within this window. Later ones stay on the map pins and in Planned. */
export const NEARBY_SOON_MS = 60 * 60 * 1000;

type StartFields = Pick<MinyanRow, "scheduled_at" | "created_at">;

/** Start time: the scheduled time, or the creation time for a "now" street minyan. */
export function minyanStartMs(m: StartFields): number {
  return new Date(m.scheduled_at ?? m.created_at).getTime();
}

/** Counted in "N minyanim near you" and shown in the list opened from that card. */
export function isNearbySoon(
  m: Pick<MinyanRow, "type" | "scheduled_at" | "created_at" | "latitude" | "longitude">,
  position: { lat: number; lng: number },
  nowMs: number,
): boolean {
  if (!isLiveOnMap(m)) return false;
  if (minyanStartMs(m) > nowMs + NEARBY_SOON_MS) return false;
  return distanceMeters(position, { lat: m.latitude, lng: m.longitude }) <= NEARBY_RADIUS_M;
}
