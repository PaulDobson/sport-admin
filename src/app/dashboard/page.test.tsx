import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

const loadOperationalContext = vi.fn();
const getInstructorDay = vi.fn();
const getFinanceDashboard = vi.fn();
const createInstructorFinanceDeps = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock("@/app/_lib/operational-context", () => ({
  loadOperationalContext: () => loadOperationalContext(),
}));
vi.mock(
  "@/infrastructure/composition/instructor-operations-composition",
  () => ({ createInstructorOperationsDeps: vi.fn(async () => ({})) }),
);
vi.mock("@/infrastructure/composition/instructor-finance-composition", () => ({
  createInstructorFinanceDeps: () => createInstructorFinanceDeps(),
}));
vi.mock(
  "@/application/instructor-operations/use-cases/get-instructor-day",
  () => ({
    getInstructorDay: (...args: unknown[]) => getInstructorDay(...args),
  }),
);
vi.mock(
  "@/application/instructor-finance/use-cases/get-finance-dashboard",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getFinanceDashboard: (...args: unknown[]) => getFinanceDashboard(...args),
  }),
);
vi.mock("@/presentation/components/current-session-panel", () => ({
  CurrentSessionPanel: () => null,
}));
vi.mock("@/presentation/components/session-context-refresh", () => ({
  SessionContextRefresh: () => null,
}));
vi.mock("./current-session-precache", () => ({
  CurrentSessionPrecache: () => null,
}));
vi.mock("./offline-synchronization", () => ({
  OfflineSynchronization: () => null,
}));

function withRole(role: string) {
  loadOperationalContext.mockResolvedValue({
    status: "ready",
    membership: { id: "m-1", tenantId: "tenant-1", userId: "u-1", role },
  });
}

afterEach(cleanup);

describe("DashboardPage finance block", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createInstructorFinanceDeps.mockResolvedValue({});
    getInstructorDay.mockResolvedValue({
      activeStudents: 3,
      pendingEnrollments: 0,
      locations: [],
      currentSession: null,
      upcomingSessions: [],
    });
    getFinanceDashboard.mockResolvedValue({
      period: "2026-10",
      previousPeriod: "2026-09",
      currencies: ["CLP"],
      indicators: [
        {
          currency: "CLP",
          collected: 150000,
          previousCollected: 0,
          variation: null,
          pending: 30000,
          pendingAccounts: 1,
          overdueAmount: 0,
          overdueStudents: 0,
          currentMemberships: 5,
          newMemberships: 1,
          projected: 180000,
          collectionRate: 83,
        },
      ],
      movements: [],
      planPerformance: [],
      actionItems: [],
    });
  });

  it("shows the month finances to roles that manage finance", async () => {
    withRole("instructor");

    render(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("region", { name: "Finanzas del mes" })).toBeTruthy();
    expect(screen.getByText("$150.000")).toBeTruthy();
    expect(getFinanceDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1" }),
      {},
    );
  });

  it("does not load nor show finances for assistants", async () => {
    withRole("assistant");

    render(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(screen.queryByRole("region", { name: "Finanzas del mes" })).toBeNull();
    expect(getFinanceDashboard).not.toHaveBeenCalled();
  });

  it("keeps the day view when the finance summary fails", async () => {
    withRole("owner");
    getFinanceDashboard.mockRejectedValue(new Error("offline"));

    render(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(screen.queryByRole("region", { name: "Finanzas del mes" })).toBeNull();
    expect(screen.getByRole("region", { name: "Resumen de jornada" })).toBeTruthy();
  });
});
