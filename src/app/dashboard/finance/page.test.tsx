import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FinanceDashboard } from "@/application/instructor-finance/use-cases/get-finance-dashboard";
import FinancePage from "./page";

const requireOperationalMembership = vi.fn();
const createInstructorFinanceDeps = vi.fn();
const listPendingCollections = vi.fn();
const getFinanceDashboard = vi.fn();
const listMembershipPlans = vi.fn();
const loadMonth = vi.fn();

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
  "@/application/instructor-finance/use-cases/get-finance-dashboard",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getFinanceDashboard: (...args: unknown[]) => getFinanceDashboard(...args),
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
    monthlyRevenueByPlan,
  }: {
    plans: unknown[];
    showArchived: boolean;
    monthlyRevenueByPlan?: Record<string, number>;
  }) => (
    <div data-testid="plan-catalog">
      {showArchived ? "archivados" : "activos"}: {plans.length}
      {" ingresos "}
      {JSON.stringify(monthlyRevenueByPlan ?? {})}
    </div>
  ),
}));

function collection(
  overrides: Partial<{ membershipId: string; status: string }> = {},
) {
  return {
    membershipId: "membership-1",
    studentId: "student-1",
    studentName: "Ana Pérez",
    planName: "Mensual",
    status: "past_due",
    expiresOn: "2026-08-30",
    nextBillingDate: "2026-08-31",
    expirationGraceDays: 5,
    currency: "CLP",
    contractedAmount: 45000,
    balance: 45000,
    dueOn: "2026-08-31",
    overdueDays: 5,
    isOverdue: true,
    ...overrides,
  };
}

function dashboard(overrides: Partial<FinanceDashboard> = {}): FinanceDashboard {
  return {
    period: "2026-08",
    previousPeriod: "2026-07",
    currencies: ["CLP"],
    indicators: [
      {
        currency: "CLP",
        collected: 120000,
        previousCollected: 100000,
        variation: 20,
        pending: 45000,
        pendingAccounts: 1,
        overdueAmount: 45000,
        overdueStudents: 1,
        currentMemberships: 4,
        newMemberships: 2,
        projected: 165000,
        collectionRate: 73,
      },
    ],
    movements: [],
    planPerformance: [],
    actionItems: [],
    ...overrides,
  };
}

function renderPage(params: Record<string, string> = {}) {
  return FinancePage({ searchParams: Promise.resolve(params) }).then(render);
}

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
    createInstructorFinanceDeps.mockResolvedValue({
      financialProjections: { loadMonth },
    });
    loadMonth.mockResolvedValue({ memberships: [], payments: [] });
    listPendingCollections.mockResolvedValue([collection()]);
    getFinanceDashboard.mockResolvedValue(dashboard());
    listMembershipPlans.mockImplementation(
      async ({ status }: { status: string }) =>
        status === "archived"
          ? [{ id: "plan-old", currency: "CLP" }]
          : [
              { id: "plan-1", currency: "CLP" },
              { id: "plan-2", currency: "USD" },
            ],
    );
  });

  it("defaults to the summary section and leads with the collected metric", async () => {
    await renderPage();

    const summaryTab = screen.getByRole("link", { name: "Resumen" });
    expect(summaryTab.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("heading", { name: "Cobrado del mes" })).toBeTruthy();
    expect(screen.getByText("$120.000")).toBeTruthy();
    expect(getFinanceDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1" }),
      expect.anything(),
    );
    expect(listPendingCollections).not.toHaveBeenCalled();
  });

  it("shows the currency chosen in the URL when there are several", async () => {
    getFinanceDashboard.mockResolvedValue(
      dashboard({
        currencies: ["CLP", "USD"],
        indicators: [
          dashboard().indicators[0],
          {
            ...dashboard().indicators[0],
            currency: "USD",
            collected: 250,
          },
        ],
      }),
    );

    await renderPage({ currency: "USD" });

    expect(screen.getByText("US$250,00")).toBeTruthy();
    expect(screen.queryByText("$120.000")).toBeNull();
  });

  it("links the pending indicator to the overdue collections", async () => {
    await renderPage();

    const link = screen.getByRole("link", { name: /Por cobrar/ });
    expect(link.getAttribute("href")).toContain("section=collections");
    expect(link.getAttribute("href")).toContain("status=past_due");
  });

  it("recalculates the summary for the period in the URL and keeps it in links", async () => {
    await renderPage({ period: "2026-03" });

    expect(getFinanceDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ period: "2026-03" }),
      expect.anything(),
    );
    const collections = screen.getByRole("link", { name: "Cobros" });
    expect(collections.getAttribute("href")).toContain("period=2026-03");
    expect(
      (screen.getByLabelText("Mes") as HTMLInputElement).defaultValue,
    ).toBe("2026-08");
  });

  it("ignores malformed periods instead of failing", async () => {
    await renderPage({ period: "2026-13" });

    expect(getFinanceDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        period: new Date().toISOString().slice(0, 7),
      }),
      expect.anything(),
    );
  });

  it("keeps the active section, period and filters in the section links", async () => {
    await renderPage({
      section: "collections",
      period: "2026-08",
      status: "past_due",
    });

    const collections = screen.getByRole("link", { name: "Cobros" });
    expect(collections.getAttribute("aria-current")).toBe("page");
    const plans = screen.getByRole("link", { name: "Planes" });
    expect(plans.getAttribute("href")).toContain("period=2026-08");
    expect(plans.getAttribute("href")).toContain("status=past_due");
    expect(screen.getByTestId("collection-list").textContent).toContain(
      "1 pendientes",
    );
  });

  it("filters collections with status chips that show counts and keep the date range", async () => {
    listPendingCollections.mockResolvedValue([
      collection(),
      collection({ membershipId: "membership-2", status: "active" }),
      collection({ membershipId: "membership-3", status: "active" }),
    ]);

    await renderPage({
      section: "collections",
      status: "active",
      from: "2026-08-01",
    });

    const chips = screen.getByRole("navigation", {
      name: "Estado de los cobros",
    });
    const active = screen.getByRole("link", { name: "Al día (2)" });
    expect(chips.contains(active)).toBe(true);
    expect(active.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Todos (3)" })).toBeTruthy();
    const overdue = screen.getByRole("link", { name: "En mora (1)" });
    expect(overdue.getAttribute("href")).toContain("status=past_due");
    expect(overdue.getAttribute("href")).toContain("from=2026-08-01");
    expect(screen.getByTestId("collection-list").textContent).toContain(
      "2 pendientes",
    );
    expect(listPendingCollections).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-08-01", to: undefined }),
      expect.anything(),
    );
  });

  it("drops empty or malformed date filters before querying", async () => {
    await renderPage({ section: "collections", from: "", to: "ayer" });

    expect(listPendingCollections).toHaveBeenCalledWith(
      expect.objectContaining({ from: undefined, to: undefined }),
      expect.anything(),
    );
  });

  it("shows archived plans with counts on both plan tabs", async () => {
    await renderPage({ section: "plans", archived: "true" });

    expect(screen.getByTestId("plan-catalog").textContent).toContain(
      "archivados: 1",
    );
    const archived = screen.getByRole("link", { name: "Archivados (1)" });
    expect(archived.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Activos (2)" })).toBeTruthy();
    expect(listMembershipPlans).toHaveBeenCalledWith(
      { tenantId: "tenant-1", status: "archived" },
      expect.anything(),
    );
  });

  it("passes monthly revenue per plan using agreed prices in the plan currency", async () => {
    loadMonth.mockResolvedValue({
      payments: [],
      memberships: [
        {
          id: "m-1",
          planId: "plan-1",
          planName: "Mensual",
          status: "active",
          startsOn: "2020-01-01",
          expiresOn: "2099-01-01",
          billingCycle: "quarterly",
          agreedPrice: 90000,
          currency: "CLP",
          expirationGraceDays: 0,
        },
      ],
    });

    await renderPage({ section: "plans" });

    expect(screen.getByTestId("plan-catalog").textContent).toContain(
      '{"plan-1":30000}',
    );
  });

  it("still renders plans when the revenue projection fails", async () => {
    loadMonth.mockRejectedValue(new Error("offline"));

    await renderPage({ section: "plans" });

    expect(screen.getByTestId("plan-catalog").textContent).toContain(
      "activos: 2 ingresos {}",
    );
  });

  it("offers plan assignment to managers but not to assistants", async () => {
    await renderPage({ section: "plans" });
    const assign = screen.getByRole("link", { name: "Asignar plan" });
    expect(assign.getAttribute("href")).toContain("assign=1");
    expect(assign.getAttribute("href")).toContain("section=plans");
    cleanup();

    requireOperationalMembership.mockResolvedValue({
      id: "actor-2",
      tenantId: "tenant-1",
      userId: "user-2",
      role: "assistant",
    });
    await renderPage({ section: "plans" });
    expect(screen.queryByRole("link", { name: "Asignar plan" })).toBeNull();
  });

  it("keeps section navigation available when a section has no data", async () => {
    listPendingCollections.mockResolvedValue([]);

    await renderPage({ section: "collections" });

    expect(screen.getByRole("link", { name: "Planes" })).toBeTruthy();
    expect(screen.getByTestId("collection-list").textContent).toContain(
      "0 pendientes",
    );
  });

  it("scopes the collection queries to the active tenant", async () => {
    await renderPage({ section: "collections" });

    expect(listPendingCollections).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1" }),
      expect.anything(),
    );
  });
});
