/**
 * Someone registered to a minyan cannot register to another one unless the two
 * start at least 30 minutes apart. The database enforces this too (trigger
 * enforce_join_spacing); the app uses the same rule to explain a disabled
 * "Join" button and to check before publishing.
 */
export const JOIN_SPACING_MS = 30 * 60 * 1000;

export type Registration = { minyan_id: string; start_at: string; address: string | null };

/** The registration that blocks joining a minyan starting at `targetStartMs`, if any. */
export function findJoinConflict(
  registrations: Registration[],
  targetMinyanId: string | null,
  targetStartMs: number,
): Registration | null {
  for (const r of registrations) {
    if (targetMinyanId && r.minyan_id === targetMinyanId) continue;
    if (Math.abs(new Date(r.start_at).getTime() - targetStartMs) < JOIN_SPACING_MS) return r;
  }
  return null;
}

/** The database raises this message when the rule is broken. */
export function isJoinSpacingError(message: string | undefined | null): boolean {
  return !!message && message.includes("already_joined_nearby_time");
}
