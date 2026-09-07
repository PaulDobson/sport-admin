import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const listStudentsForAdministration = vi.fn();
const resolveOperationalContextForUser = vi.fn();
const findOperationalByUser = vi.fn();
const getCurrentUserId = vi.fn();

vi.mock(
  "@/application/instructor-operations/use-cases/list-students-for-administration",
  () => ({
    listStudentsForAdministration: (...args: unknown[]) =>
      listStudentsForAdministration(...args),
  }),
);
vi.mock("@/infrastructure/composition/auth-composition", () => ({
  createAuthDeps: async () => ({
    auth: { getCurrentUserId },
    memberships: {},
    tenants: { findOperationalByUser },
  }),
}));
vi.mock(
  "@/infrastructure/composition/instructor-operations-composition",
  () => ({
    createInstructorOperationsDeps: async () => ({ students: {} }),
  }),
);
vi.mock("@/app/_lib/operational-context", () => ({
  resolveOperationalContextForUser: (...args: unknown[]) =>
    resolveOperationalContextForUser(...args),
}));

describe("GET /api/students/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("user-1");
    resolveOperationalContextForUser.mockResolvedValue({
      status: "ready",
      membership: { tenantId: "tenant-1", role: "owner" },
      memberships: [],
    });
    findOperationalByUser.mockResolvedValue([
      { id: "tenant-1", name: "Academia Norte" },
    ]);
    listStudentsForAdministration.mockResolvedValue({
      page: 2,
      pageSize: 10,
      total: 1,
      rows: [
        {
          id: "student-1",
          tenantId: "tenant-1",
          fullName: "Ana Bravo",
          birthDate: "1995-01-01",
          status: "active",
          createdAt: new Date("2026-09-01T00:00:00.000Z"),
          archivedAt: null,
          primaryContact: {
            type: "email",
            label: null,
            value: "ana@example.com",
            isPrimary: true,
          },
        },
      ],
    });
  });

  it("returns a real xlsx workbook for the filtered student view", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/students/export?search=Ana&status=active&page=2&pageSize=10",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("content-disposition")).toContain(".xlsx");
    expect(listStudentsForAdministration).toHaveBeenCalledWith(
      {
        tenantId: "tenant-1",
        page: 2,
        pageSize: 10,
        search: "Ana",
        status: "active",
      },
      expect.anything(),
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await response.arrayBuffer());
    const worksheet = workbook.getWorksheet("Alumnos");
    expect(worksheet?.getCell("B1").value).toBe("Academia Norte");
    expect(worksheet?.getCell("A10").value).toBe("Ana Bravo");
    expect(worksheet?.getCell("B10").value).toBe("Email: ana@example.com");
  });

  it("rejects student export for assistants", async () => {
    resolveOperationalContextForUser.mockResolvedValue({
      status: "ready",
      membership: { tenantId: "tenant-1", role: "assistant" },
      memberships: [],
    });

    const response = await GET(
      new Request("http://localhost/api/students/export?status=active"),
    );

    expect(response.status).toBe(403);
    expect(listStudentsForAdministration).not.toHaveBeenCalled();
  });
});
