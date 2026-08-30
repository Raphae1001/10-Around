import { afterEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

const { publishStreetMinyan, publishScheduledMinyan, PublishMinyanError, isDuplicateNearbyError } =
  await import("@/lib/minyan-publish");

afterEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
});

/** Configures fromMock so `.from("minyan_participants").insert(payload)` resolves with `error`, and captures the insert payload for assertions. */
function mockParticipantInsert(error: { message: string } | null, captured: { payload?: unknown }) {
  fromMock.mockImplementation((table: string) => {
    if (table === "minyan_participants") {
      return {
        insert: (payload: unknown) => {
          captured.payload = payload;
          return Promise.resolve({ error });
        },
      };
    }
    throw new Error(`unexpected table: ${table}`);
  });
}

describe("isDuplicateNearbyError", () => {
  it("matches the RPC's raised exception message", () => {
    expect(isDuplicateNearbyError("duplicate_nearby")).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isDuplicateNearbyError("permission denied")).toBe(false);
  });
});

describe("publishStreetMinyan", () => {
  const baseParams = {
    userId: "user-1",
    prayer: "mincha" as const,
    message: null,
    address: "123 Main St",
    lat: 31.78,
    lng: 35.22,
    scheduledAt: null,
    extraPresent: 2,
    expiresAt: "2026-06-15T14:00:00.000Z",
  };

  it("creates the minyan and the creator's participant row with ready_now: true", async () => {
    rpcMock.mockResolvedValue({ data: [{ id: "minyan-1" }], error: null });
    const captured: { payload?: unknown } = {};
    mockParticipantInsert(null, captured);

    const id = await publishStreetMinyan(baseParams);

    expect(id).toBe("minyan-1");
    expect(rpcMock).toHaveBeenCalledWith("create_street_minyan", {
      _prayer: "mincha",
      _message: null,
      _address: "123 Main St",
      _lat: 31.78,
      _lng: 35.22,
      _scheduled_at: null,
      _extra_present: 2,
      _expires_at: "2026-06-15T14:00:00.000Z",
    });
    expect(captured.payload).toEqual({
      minyan_id: "minyan-1",
      user_id: "user-1",
      ready_now: true,
    });
  });

  it("throws a duplicate_nearby PublishMinyanError when the RPC raises it", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "duplicate_nearby" } });

    await expect(publishStreetMinyan(baseParams)).rejects.toMatchObject({
      kind: "duplicate_nearby",
    });
  });

  it("throws insert_failed for any other RPC error", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "connection reset" } });

    await expect(publishStreetMinyan(baseParams)).rejects.toMatchObject({
      kind: "insert_failed",
    });
  });

  it("throws participant_failed if the participant insert fails, distinct from insert_failed", async () => {
    rpcMock.mockResolvedValue({ data: [{ id: "minyan-1" }], error: null });
    mockParticipantInsert({ message: "fk violation" }, {});

    const failure = await publishStreetMinyan(baseParams).catch((e) => e);
    expect(failure).toBeInstanceOf(PublishMinyanError);
    expect(failure.kind).toBe("participant_failed");
  });
});

describe("publishScheduledMinyan", () => {
  const baseParams = {
    userId: "user-1",
    prayer: "shacharit" as const,
    message: "bring a coat",
    address: "45 Rue de Rivoli",
    city: "Paris",
    lat: 48.86,
    lng: 2.35,
    scheduledAt: "2026-06-20T06:00:00.000Z",
    expiresAt: "2026-06-20T06:40:00.000Z",
  };

  it("creates a scheduled minyan (distinct shape from street: type, is_live, present_count) and the participant row without ready_now", async () => {
    rpcMock.mockResolvedValue({ data: 0, error: null });
    const minyanCaptured: { payload?: unknown } = {};
    const participantCaptured: { payload?: unknown } = {};
    fromMock.mockImplementation((table: string) => {
      if (table === "minyanim") {
        return {
          insert: (payload: unknown) => {
            minyanCaptured.payload = payload;
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: "minyan-2" }, error: null }),
              }),
            };
          },
        };
      }
      if (table === "minyan_participants") {
        return {
          insert: (payload: unknown) => {
            participantCaptured.payload = payload;
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const id = await publishScheduledMinyan(baseParams);

    expect(id).toBe("minyan-2");
    expect(rpcMock).toHaveBeenCalledWith("count_minyanim_within", {
      lat: 48.86,
      lng: 2.35,
      radius_m: 200,
      _start: "2026-06-20T06:00:00.000Z",
    });
    expect(minyanCaptured.payload).toMatchObject({
      type: "scheduled",
      is_live: false,
      present_count: 1,
      extra_present: 0,
      city: "Paris",
    });
    // ready_now is intentionally omitted for the scheduled flow (unlike street).
    expect(participantCaptured.payload).toEqual({
      minyan_id: "minyan-2",
      user_id: "user-1",
    });
  });

  it("throws duplicate_nearby when count_minyanim_within finds an existing nearby minyan, without ever inserting", async () => {
    rpcMock.mockResolvedValue({ data: 1, error: null });

    await expect(publishScheduledMinyan(baseParams)).rejects.toMatchObject({
      kind: "duplicate_nearby",
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("throws insert_failed if the duplicate-check RPC itself errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "timeout" } });

    await expect(publishScheduledMinyan(baseParams)).rejects.toMatchObject({
      kind: "insert_failed",
    });
  });

  it("throws insert_failed if the minyanim insert fails", async () => {
    rpcMock.mockResolvedValue({ data: 0, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "minyanim") {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: "constraint" } }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    await expect(publishScheduledMinyan(baseParams)).rejects.toMatchObject({
      kind: "insert_failed",
    });
  });
});
