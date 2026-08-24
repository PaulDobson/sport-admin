import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const exportStudentPersonalData = vi.fn();
const findOperationalByUser = vi.fn();
const getCurrentUserId = vi.fn();

vi.mock(
  "@/application/evolution-health-attendance/use-cases/manage-student-privacy",
  () => ({
    exportStudentPersonalData: (...args: unknown[]) =>
      exportStudentPersonalData(...args),
  }),
);
vi.mock("@/infrastructure/composition/auth-composition", () => ({
  createAuthDeps: async () => ({
    auth: { getCurrentUserId },
    memberships: { findOperationalByUser },
  }),
}));
vi.mock(
  "@/infrastructure/composition/evolution-health-attendance-composition",
  () => ({
    createEvolutionHealthAttendanceDeps: async () => ({ privacy: {} }),
  }),
);

const tenantId = "25000000-0000-4000-8000-000000000001";
const otherTenantId = "25000000-0000-4000-8000-000000000002";
const studentId = "25000000-0000-4000-8000-000000000003";

describe("GET /api/students/[studentId]/personal-data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("user-1");
    findOperationalByUser.mockResolvedValue([{ tenantId }]);
    exportStudentPersonalData.mockResolvedValue({ student: { id: studentId } });
  });

  it("derives the tenant from the authenticated membership", async () => {
    const response = await GET(
      new Request(
        `http://localhost/api/students/${studentId}/personal-data?tenantId=${otherTenantId}`,
      ),
      { params: Promise.resolve({ studentId }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(exportStudentPersonalData).toHaveBeenCalledWith(
      { tenantId, studentId },
      expect.anything(),
    );
  });

  it("rejects unauthenticated exports", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ studentId }),
    });

    expect(response.status).toBe(401);
    expect(exportStudentPersonalData).not.toHaveBeenCalled();
  });
});
