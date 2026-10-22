import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FinanceDashboard } from "@/application/instructor-finance/use-cases/get-finance-dashboard";
import FinancePage from "./page";

const requireOperationalMembership = vi.fn();
const createInstructorFinanceDeps = vi.fn();
const getFinanceDashboard = vi.fn();

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
  "@/application/instructor-finance/use-cases/get-finance-dashboard",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getFinanceDashboard: (...args: unknown[]) => getFinanceDashboard(...args),
  }),
);
vi.mock("./summary/finance-summary", () => ({
  FinanceSummary: ({
    dashboard,
    currency,
  }: {
    dashboard: FinanceDashboard;
    currency: string;
  }) => (
    <div data-testid="finance-summary">
      {currency}: {dashboard.indicators[0]?.collected ?? 0}
    </div>
  ),
}));

function dashboard(
  overrides: Partial<FinanceDashboard> = {},
): FinanceDashboard {
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

describe("FinancePage (dashboard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOperationalMembership.mockResolvedValue({
      id: "actor-1",
      tenantId: "tenant-1",
      userId: "user-1",
      role: "owner",
    });
    createInstructorFinanceDeps.mockResolvedValue({
      financialProjections: {
        loadMonth: vi.fn().mockResolvedValue({ memberships: [], payments: [] }),
      },
    });
    getFinanceDashboard.mockResolvedValue(dashboard());
  });

  it("renders the financial summary dashboard with the collected metric", async () => {
    await renderPage();

    expect(screen.getByTestId("finance-summary")).toBeTruthy();
    expect(getFinanceDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1" }),
      expect.anything(),
    );
  });

  it("shows the three quick-access cards linking to sub-sections", async () => {
    await renderPage();

    const collectionsLink = screen.getByRole("link", { name: /Cobros/ });
    expect(collectionsLink.getAttribute("href")).toBe(
      "/dashboard/finance/collections",
    );

    const plansLink = screen.getByRole("link", {
      name: /Mantención de planes/,
    });
    expect(plansLink.getAttribute("href")).toBe("/dashboard/finance/plans");

    // Resumen card is aria-current=page since we're on /dashboard/finance
    const summaryCard = screen.getByRole("link", { name: /Resumen/ });
    expect(summaryCard.getAttribute("aria-current")).toBe("page");
  });

  it("shows the Asignar plan button for managers", async () => {
    await renderPage();

    const assignLink = screen.getByRole("link", { name: "Asignar plan" });
    expect(assignLink.getAttribute("href")).toContain("assign=1");
  });

  it("hides the Asignar plan button for assistants", async () => {
    requireOperationalMembership.mockResolvedValue({
      id: "actor-2",
      tenantId: "tenant-1",
      userId: "user-2",
      role: "assistant",
    });

    await renderPage();

    expect(screen.queryByRole("link", { name: "Asignar plan" })).toBeNull();
  });

  it("recalculates the summary for the period in the URL", async () => {
    await renderPage({ period: "2026-03" });

    expect(getFinanceDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ period: "2026-03" }),
      expect.anything(),
    );
  });

  it("ignores malformed periods and falls back to the current month", async () => {
    await renderPage({ period: "2026-13" });

    expect(getFinanceDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        period: new Date().toISOString().slice(0, 7),
      }),
      expect.anything(),
    );
  });

  it("scopes the dashboard query to the active tenant", async () => {
    await renderPage();

    expect(getFinanceDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1" }),
      expect.anything(),
    );
  });

  it("selects the requested currency when present in the dashboard", async () => {
    getFinanceDashboard.mockResolvedValue(
      dashboard({
        currencies: ["CLP", "USD"],
        indicators: [
          dashboard().indicators[0],
          { ...dashboard().indicators[0], currency: "USD", collected: 250 },
        ],
      }),
    );

    await renderPage({ currency: "USD" });

    // FinanceSummary stub shows "currency: collected"
    expect(screen.getByTestId("finance-summary").textContent).toContain("USD:");
  });
});
