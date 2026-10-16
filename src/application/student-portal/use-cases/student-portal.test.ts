import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import type { StudentPortalPort } from "../ports/student-portal-port";
import {
  createStudentPortalInvitation,
  enrollStudentPortalSession,
  listStudentPortalSessions,
} from "./student-portal";

const validId = "73100000-0000-4000-8000-000000000031";

function createPortal(): StudentPortalPort {
  return {
    createInvitation: vi.fn().mockResolvedValue({
      email: "guardian@example.test",
      tenantName: "Academy",
      expiresAt: new Date("2026-10-10T00:00:00Z"),
    }),
    lookupInvitation: vi.fn().mockResolvedValue(null),
    hasPendingInvitationForCurrentUser: vi.fn().mockResolvedValue(false),
    redeemInvitation: vi.fn(),
    listMyStudents: vi.fn().mockResolvedValue([]),
    listSessions: vi.fn().mockResolvedValue([]),
    enroll: vi.fn().mockResolvedValue("confirmed"),
    cancelEnrollment: vi.fn(),
  };
}

describe("student portal use cases", () => {
  it("rejects invitation creation with a non-uuid student id", async () => {
    const portal = createPortal();
    await expect(
      createStudentPortalInvitation(
        {
          tenantId: validId,
          studentId: "not-a-uuid",
          tokenHash: "a".repeat(64),
          expiresAt: new Date("2026-10-10T00:00:00Z"),
        },
        { portal },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(portal.createInvitation).not.toHaveBeenCalled();
  });

  it("rejects malformed invitation hashes before repository access", async () => {
    const portal = createPortal();
    await expect(
      createStudentPortalInvitation(
        {
          tenantId: validId,
          studentId: validId,
          tokenHash: "short",
          expiresAt: new Date("2026-10-10T00:00:00Z"),
        },
        { portal },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(portal.createInvitation).not.toHaveBeenCalled();
  });

  it("does not request sessions for malformed student ids", async () => {
    const portal = createPortal();
    await expect(
      listStudentPortalSessions("student-1", { portal }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(portal.listSessions).not.toHaveBeenCalled();
  });

  it("enrolls only after validating all tenant-scoped ids", async () => {
    const portal = createPortal();
    await expect(
      enrollStudentPortalSession(
        { tenantId: validId, studentId: validId, sessionId: validId },
        { portal },
      ),
    ).resolves.toBe("confirmed");
    expect(portal.enroll).toHaveBeenCalledWith({
      tenantId: validId,
      studentId: validId,
      sessionId: validId,
    });
  });
});
