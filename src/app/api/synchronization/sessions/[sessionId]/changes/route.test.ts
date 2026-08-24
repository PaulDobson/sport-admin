import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const findOperationalByUser = vi.fn();
const limit = vi.fn();
const order = vi.fn(() => ({ limit }));
const gt = vi.fn(() => ({ order }));
const eq = vi.fn(() => ({ gt }));
const select = vi.fn(() => ({ eq }));

vi.mock("@/infrastructure/composition/auth-composition", () => ({
  createAuthDeps: async () => ({
    auth: { getCurrentUserId: async () => "user-1" },
    memberships: { findOperationalByUser },
  }),
}));
vi.mock("@/infrastructure/supabase/server-client", () => ({
  createSupabaseServerClient: async () => ({
    from: vi.fn(() => ({ select })),
  }),
}));

describe("GET session changes", () => {
  beforeEach(() => {
    findOperationalByUser.mockResolvedValue([{ tenantId: "tenant-1" }]);
    limit.mockResolvedValue({
      data: [
        {
          id: 12,
          event_type: "attendance",
          entity_id: "event-1",
          operation: "update",
          occurred_at: "2026-08-23T14:05:00Z",
        },
      ],
      error: null,
    });
  });

  it("queries authorized durable events after the supplied cursor", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/synchronization/sessions/session-1/changes?after=11",
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(response.status).toBe(200);
    expect(eq).toHaveBeenCalledWith("session_id", "session-1");
    expect(gt).toHaveBeenCalledWith("id", 11);
    expect(await response.json()).toMatchObject({
      events: [{ id: 12, eventType: "attendance" }],
    });
  });
});
