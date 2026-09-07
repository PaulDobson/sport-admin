import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FinancePage from "./page";

const requireOperationalMembership = vi.fn();
const createInstructorFinanceDeps = vi.fn();
const listPendingCollections = vi.fn();
const getCollectionPeriodReport = vi.fn();
const listMembershipPlans = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  usePathname: () => "/dashboard/finance",
}));
vi.mock("@/app/_lib/operational-context", () => ({
  requireOperationalMembership: () => requireOperationalMembership(),
}));
vi.mock("@/infrastructure/composition/instructor-finance-composition", () => ({
  createInstructorFinanceDeps: () => createInstructorFinanceDeps(),
}));
vi.mock(
  "@/application/instructor-finance/use-cases/list-pending-collections",
  () => ({
    listPendingCollections: (...args: unknown[]) =>
      listPendingCollections(...args),
  }),
);
vi.mock(
  "@/application/instructor-finance/use-cases/get-collection-period-report",
  () => ({
    getCollectionPeriodReport: (...args: unknown[]) =>
      getCollectionPeriodReport(...args),
  }),
);
vi.mock("@/application/instructor-finance/use-cases/manage-membership", () => ({
  listMembershipPlans: (...args: unknown[]) => listMembershipPlans(...args),
}));
vi.mock("./collection-list", () => ({
  CollectionList: ({ items }: { items: Array<{ studentName: string }> }) => (
    <div data-testid="collection-list">{items.length} pendientes listados</div>
  ),
}));
vi.mock("./plan-catalog", () => ({
  PlanCatalog: ({
    plans,
    showArchived,
  }: {
    plans: unknown[];
    showArchived: boolean;
  }) => (
    <div data-testid="plan-catalog">
      {showArchived ? "archivados" : "activos"}: {plans.length}
    </div>
  ),
}));

const overdue = {
  membershipId: "membership-1",
  studentId: "student-1",
  studentName: "Ana Pérez",
  planName: "Mensual",
  status: "past_due" as const,
  expiresOn: "2026-08-30",
  nextBillingDate: "2026-08-31",
  expirationGraceDays: 5,
  currency: "CLP",
  contractedAmount: 45000,
  balance: 45000,
  dueOn: "2026-08-31",
  overdueDays: 5,
  isOverdue: true,
};

afterEach(cleanup);

describe("FinancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOperationalMembership.mockResolvedValue({
      id: "actor-1",
      tenantId: "tenant-1",
      userId: "user-1",
      role: "owner",
    });
    createInstructorFinanceDeps.mockResolvedValue({});
    listPendingCollections.mockResolvedValue([overdue]);
    getCollectionPeriodReport.mockResolvedValue({
      payments: [],
      byCurrency: [
        {
          currency: "CLP",
          collectedAmount: 120000,
          pendingAmount: 45000,
          paymentCount: 3,
        },
      ],
    });
    listMembershipPlans.mockResolvedValue([{ id: "plan-1" }]);
  });

  it("defaults to the summary section and leads with the collected metric", async () => {
    render(await FinancePage({ searchParams: Promise.resolve({}) }));

    const summaryTab = screen.getByRole("link", { name: "Resumen" });
    expect(summaryTab.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText(/Cobrado en/)).toBeTruthy();
    expect(screen.getByText("$120.000")).toBeTruthy();
  });

  it("links the overdue indicator to the already filtered collections section", async () => {
    render(await FinancePage({ searchParams: Promise.resolve({}) }));

    const link = screen.getByRole("link", { name: /Mora/ });
    expect(link.getAttribute("href")).toContain("section=collections");
    expect(link.getAttribute("href")).toContain("status=past_due");
  });

  it("keeps the active section, period and filters in the section links", async () => {
    render(
      await FinancePage({
        searchParams: Promise.resolve({
          section: "collections",
          period: "2026-08",
          status: "past_due",
        }),
      }),
    );

    const collections = screen.getByRole("link", { name: "Cobros" });
    expect(collections.getAttribute("aria-current")).toBe("page");
    const plans = screen.getByRole("link", { name: "Planes" });
    expect(plans.getAttribute("href")).toContain("period=2026-08");
    expect(plans.getAttribute("href")).toContain("status=past_due");
    expect(screen.getByTestId("collection-list").textContent).toContain(
      "1 pendientes",
    );
  });

  it("shows archived plans when the archived flag is set", async () => {
    render(
      await FinancePage({
        searchParams: Promise.resolve({ section: "plans", archived: "true" }),
      }),
    );

    expect(screen.getByTestId("plan-catalog").textContent).toContain(
      "archivados",
    );
    expect(listMembershipPlans).toHaveBeenCalledWith(
      { tenantId: "tenant-1", status: "archived" },
      {},
    );
  });

  it("keeps section navigation available when a section has no data", async () => {
    listPendingCollections.mockResolvedValue([]);

    render(
      await FinancePage({
        searchParams: Promise.resolve({ section: "collections" }),
      }),
    );

    expect(screen.getByRole("link", { name: "Planes" })).toBeTruthy();
    expect(screen.getByTestId("collection-list").textContent).toContain(
      "0 pendientes",
    );
  });

  it("scopes the collection queries to the active tenant", async () => {
    render(
      await FinancePage({
        searchParams: Promise.resolve({ section: "collections" }),
      }),
    );

    expect(listPendingCollections).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1" }),
      {},
    );
  });
});
