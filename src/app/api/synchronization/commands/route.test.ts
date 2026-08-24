import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const saveAttendanceBatch = vi.fn();
const findOperationalByUser = vi.fn();

vi.mock(
  "@/application/evolution-health-attendance/use-cases/save-attendance-batch",
  () => ({
    saveAttendanceBatch: (...args: unknown[]) => saveAttendanceBatch(...args),
  }),
);
vi.mock("@/infrastructure/composition/auth-composition", () => ({
  createAuthDeps: async () => ({
    auth: { getCurrentUserId: async () => "user-1" },
    memberships: { findOperationalByUser },
  }),
}));
vi.mock(
  "@/infrastructure/composition/evolution-health-attendance-composition",
  () => ({
    createEvolutionHealthAttendanceDeps: async () => ({ attendance: {} }),
  }),
);

const tenantId = "c84d5db9-bc46-4f45-aa31-d16e77327c01";
const otherTenantId = "db814433-99c7-4795-a664-d4728075389a";
const membershipId = "89721ba3-65e0-467d-bffa-abf4249cf3c6";

function request(commandTenantId: string) {
  return new Request("http://localhost/api/synchronization/commands", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operationId: "0d23446f-7386-4eba-b217-9f94f2ae45a7",
      tenantId: commandTenantId,
      type: "attendance.batch",
      payload: {
        sessionId: "f1541ed4-ee2c-45df-8618-72d96e682ad7",
        recordedByMembershipId: "client-controlled-value",
        items: [
          {
            studentId: "905fd6fc-9f10-4cf7-8aee-b9f187f2f3d1",
            status: "present",
            operationId: "3b39a94c-a8f0-44b2-959a-2e8e1f03c9d1",
          },
        ],
      },
    }),
  });
}

describe("POST /api/synchronization/commands", () => {
  beforeEach(() => {
    saveAttendanceBatch.mockReset();
    findOperationalByUser.mockResolvedValue([{ id: membershipId, tenantId }]);
  });

  it("rejects commands for a tenant outside the authenticated membership", async () => {
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const response = await POST(request(otherTenantId));
    expect(response.status).toBe(403);
    expect(saveAttendanceBatch).not.toHaveBeenCalled();
    const event = String(warning.mock.calls[0][0]);
    expect(JSON.parse(event)).toMatchObject({
      area: "rls",
      operation: "process_commands",
      outcome: "rejected",
      errorCode: "FORBIDDEN_TENANT",
    });
    expect(event).not.toContain(otherTenantId);
  });

  it("uses the server membership and confirms a successful command", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await POST(request(tenantId));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ confirmed: true });
    expect(saveAttendanceBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        recordedByMembershipId: membershipId,
      }),
      expect.anything(),
    );
    expect(JSON.parse(String(info.mock.calls[0][0]))).toMatchObject({
      area: "offline_sync",
      operation: "process_commands",
      outcome: "success",
      itemCount: 1,
    });
  });
});
