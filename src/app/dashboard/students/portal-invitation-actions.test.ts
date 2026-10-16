import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStudentPortalInviteAction,
  type StudentPortalInviteState,
} from "./[studentId]/portal-invitation-actions";

const requireOperationalMembership = vi.fn();
const createInvitation = vi.fn();

vi.mock("@/app/_lib/operational-context", () => ({
  requireOperationalMembership: () => requireOperationalMembership(),
}));
vi.mock("@/infrastructure/composition/student-portal-composition", () => ({
  createStudentPortalDeps: async () => ({
    siteUrl: "https://sport.example.test",
    portal: { createInvitation },
  }),
}));

afterEach(() => vi.clearAllMocks());

describe("createStudentPortalInviteAction", () => {
  it("stores only a hash and returns a one-time shareable invite url", async () => {
    requireOperationalMembership.mockResolvedValue({
      tenantId: "73100000-0000-4000-8000-000000000001",
      role: "owner",
    });
    createInvitation.mockResolvedValue({
      email: "guardian@example.test",
      tenantName: "Academia Norte",
      expiresAt: new Date("2026-10-13T12:00:00.000Z"),
    });
    const formData = new FormData();
    formData.set("studentId", "73100000-0000-4000-8000-000000000031");

    const state: StudentPortalInviteState =
      await createStudentPortalInviteAction(
        { error: null, inviteUrl: null, email: null, expiresAt: null },
        formData,
      );

    expect(state.error).toBeNull();
    expect(state.email).toBe("guardian@example.test");
    expect(state.inviteUrl).toMatch(
      /^https:\/\/sport\.example\.test\/portal\/accept\?token=[a-f0-9]{64}$/,
    );
    const token = new URL(state.inviteUrl!).searchParams.get("token")!;
    expect(createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "73100000-0000-4000-8000-000000000001",
        studentId: "73100000-0000-4000-8000-000000000031",
        tokenHash: createHash("sha256").update(token).digest("hex"),
      }),
    );
  });

  it("does not allow assistants to create invitations", async () => {
    requireOperationalMembership.mockResolvedValue({
      tenantId: "73100000-0000-4000-8000-000000000001",
      role: "assistant",
    });
    const formData = new FormData();
    formData.set("studentId", "73100000-0000-4000-8000-000000000031");

    const state = await createStudentPortalInviteAction(
      { error: null, inviteUrl: null, email: null, expiresAt: null },
      formData,
    );

    expect(state.error).toContain("No tienes permiso");
    expect(createInvitation).not.toHaveBeenCalled();
  });
});
