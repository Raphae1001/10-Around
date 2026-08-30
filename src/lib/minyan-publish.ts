/**
 * Shared publish logic for the street (`create.tsx`) and scheduled
 * (`create-scheduled.tsx`) minyan-creation flows.
 *
 * create-stay.tsx is intentionally NOT covered here — it has its own,
 * separate creation shape (trip dates, prayer interests) and is out of
 * scope for this extraction.
 *
 * IMPORTANT — the two flows have different concurrency guarantees, and
 * this module does not paper over that:
 *  - Street goes through `create_street_minyan()`, a single atomic RPC
 *    (duplicate-check + insert in one transaction, serialized per creator
 *    via an advisory lock — see 20260827120000_atomic_street_minyan_create.sql).
 *  - Scheduled still does a separate duplicate-check RPC call followed by a
 *    separate insert, exactly as it did before this refactor. That is a
 *    pre-existing TOCTOU race (two rapid submissions could both pass the
 *    check before either inserts) — this refactor does not fix it and does
 *    not reuse create_street_minyan's artificial branches to paper over it.
 *    Closing it for real would need its own atomic RPC (mirroring
 *    create_street_minyan for the scheduled shape), which is a migration
 *    and a separate, explicitly authorized step.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MinyanPrayer = Database["public"]["Enums"]["minyan_prayer"];

export type PublishMinyanErrorKind = "duplicate_nearby" | "insert_failed" | "participant_failed";

export class PublishMinyanError extends Error {
  readonly kind: PublishMinyanErrorKind;
  constructor(kind: PublishMinyanErrorKind, message: string) {
    super(message);
    this.name = "PublishMinyanError";
    this.kind = kind;
  }
}

/** Pure — no Supabase call. Exposed for testing the classification logic in isolation. */
export function isDuplicateNearbyError(message: string): boolean {
  return message.includes("duplicate_nearby");
}

async function insertCreatorParticipant(
  minyanId: string,
  userId: string,
  readyNow: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("minyan_participants")
    .insert({ minyan_id: minyanId, user_id: userId, ...(readyNow ? { ready_now: true } : {}) });
  if (error) throw new PublishMinyanError("participant_failed", error.message);
}

export type PublishStreetMinyanParams = {
  userId: string;
  prayer: MinyanPrayer;
  message: string | null;
  address: string;
  lat: number;
  lng: number;
  scheduledAt: string | null;
  extraPresent: number;
  expiresAt: string;
};

/** Street flow: atomic duplicate-check + insert via create_street_minyan(), then the creator's own participant row (ready_now: true, matching the "already there" semantics of the street flow). Returns the created minyan's id. */
export async function publishStreetMinyan(params: PublishStreetMinyanParams): Promise<string> {
  const { data, error } = await supabase.rpc("create_street_minyan", {
    _prayer: params.prayer,
    _message: params.message,
    _address: params.address,
    _lat: params.lat,
    _lng: params.lng,
    _scheduled_at: params.scheduledAt,
    _extra_present: params.extraPresent,
    _expires_at: params.expiresAt,
  });

  if (error) {
    if (isDuplicateNearbyError(error.message)) {
      throw new PublishMinyanError("duplicate_nearby", error.message);
    }
    throw new PublishMinyanError("insert_failed", error.message);
  }
  const created = data?.[0];
  if (!created) throw new PublishMinyanError("insert_failed", "No minyan returned");

  await insertCreatorParticipant(created.id, params.userId, true);
  return created.id;
}

export type PublishScheduledMinyanParams = {
  userId: string;
  prayer: MinyanPrayer;
  message: string | null;
  address: string;
  city: string | null;
  lat: number;
  lng: number;
  scheduledAt: string;
  expiresAt: string;
};

/**
 * Scheduled flow: separate duplicate-check RPC then a separate insert (not
 * atomic — see the module doc comment), then the creator's own participant
 * row (ready_now omitted, matching the scheduled flow's existing behavior).
 * Returns the created minyan's id.
 */
export async function publishScheduledMinyan(
  params: PublishScheduledMinyanParams,
): Promise<string> {
  const { data: nearbyCount, error: rpcErr } = await supabase.rpc("count_minyanim_within", {
    lat: params.lat,
    lng: params.lng,
    radius_m: 200,
    _start: params.scheduledAt,
  });
  if (rpcErr) throw new PublishMinyanError("insert_failed", rpcErr.message);
  if ((nearbyCount ?? 0) > 0) {
    throw new PublishMinyanError("duplicate_nearby", "duplicate_nearby");
  }

  const { data: created, error } = await supabase
    .from("minyanim")
    .insert({
      creator_id: params.userId,
      type: "scheduled",
      prayer: params.prayer,
      message: params.message,
      address: params.address,
      city: params.city,
      latitude: params.lat,
      longitude: params.lng,
      is_live: false,
      scheduled_at: params.scheduledAt,
      present_count: 1,
      extra_present: 0,
      expires_at: params.expiresAt,
    })
    .select()
    .single();
  if (error) throw new PublishMinyanError("insert_failed", error.message);

  await insertCreatorParticipant(created.id, params.userId, false);
  return created.id;
}
