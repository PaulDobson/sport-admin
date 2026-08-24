import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const getOperationalReport = vi.fn();
const getMonthlyFinancialProjection = vi.fn();
const getSaasFinancialDashboard = vi.fn();
const findOperationalByUser = vi.fn();

vi.mock("@/application/reporting/use-cases/get-operational-report", () => ({
  getOperationalReport: (...args: unknown[]) => getOperationalReport(...args),
}));
vi.mock(
  "@/application/instructor-finance/use-cases/get-monthly-financial-projection",
  () => ({
    getMonthlyFinancialProjection: (...args: unknown[]) =>
      getMonthlyFinancialProjection(...args),
  }),
);
vi.mock(
  "@/application/saas-administration/use-cases/get-saas-financial-dashboard",
  () => ({
    getSaasFinancialDashboard: (...args: unknown[]) =>
      getSaasFinancialDashboard(...args),
  }),
);
vi.mock("@/infrastructure/composition/auth-composition", () => ({
  createAuthDeps: async () => ({
    auth: { getCurrentUserId: async () => "user-1" },
    memberships: { findOperationalByUser },
  }),
}));
vi.mock("@/infrastructure/composition/reporting-composition", () => ({
  createReportingDeps: async () => ({ operationalReports: {} }),
}));
vi.mock("@/infrastructure/composition/instructor-finance-composition", () => ({
  createInstructorFinanceDeps: async () => ({ financialProjections: {} }),
}));
vi.mock("@/infrastructure/composition/saas-administration-composition", () => ({
  createSaasAdministrationDeps: async () => ({ financialDashboard: {} }),
}));

const tenantId = "25000000-0000-4000-8000-000000000001";
const otherTenantId = "25000000-0000-4000-8000-000000000002";

describe("GET /api/reports/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOperationalByUser.mockResolvedValue([{ tenantId }]);
  });

  it("derives operational report tenant from the authenticated membership", async () => {
    getOperationalReport.mockResolvedValue({
      activeStudents: 1,
      attendance: { total: 1, present: 1, absent: 0, late: 0, excused: 0 },
      evaluations: 0,
      openAlerts: 0,
    });

    const response = await GET(
      new Request(
        `http://localhost/api/reports/export?report=operational&from=2026-08-01&to=2026-08-31&tenantId=${otherTenantId}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(getOperationalReport).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId }),
      expect.anything(),
    );
    expect(getOperationalReport).not.toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: otherTenantId }),
      expect.anything(),
    );
  });

  it("labels instructor and SaaS finance as separate ledgers", async () => {
    getMonthlyFinancialProjection.mockResolvedValue([
      {
        currency: "USD",
        contractedAmount: 10,
        collectibleAmount: 9,
        collectedAmount: 8,
      },
    ]);
    getSaasFinancialDashboard.mockResolvedValue([
      {
        currency: "USD",
        mrr: 100,
        arr: 1200,
        arpa: 100,
        collectedNet: 90,
        pendingAmount: 5,
        pastDueAmount: 5,
      },
    ]);

    const instructor = await GET(
      new Request(
        "http://localhost/api/reports/export?report=instructor-finance&period=2026-08",
      ),
    );
    const saas = await GET(
      new Request(
        "http://localhost/api/reports/export?report=saas-finance&period=2026-08",
      ),
    );

    const instructorCsv = await instructor.text();
    const saasCsv = await saas.text();
    expect(instructorCsv).toContain("instructor,2026-08,USD");
    expect(saasCsv).toContain("saas,2026-08,USD");
    expect(instructorCsv).not.toContain("saas,2026-08,USD");
  });
});
