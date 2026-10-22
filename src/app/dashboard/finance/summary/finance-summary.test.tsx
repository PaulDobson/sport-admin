import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  FinanceDashboard,
  FinanceIndicators,
} from "@/application/instructor-finance/use-cases/get-finance-dashboard";
import { FinanceSummary } from "./finance-summary";

vi.mock("../collection-list", () => ({
  CollectionList: ({ items }: { items: unknown[] }) => (
    <div data-testid="action-items">{items.length} por atender</div>
  ),
}));

function indicators(
  overrides: Partial<FinanceIndicators> = {},
): FinanceIndicators {
  return {
    currency: "CLP",
    collected: 120000,
    previousCollected: 100000,
    variation: 20,
    pending: 45000,
    pendingAccounts: 2,
    overdueAmount: 30000,
    overdueStudents: 1,
    currentMemberships: 4,
    newMemberships: 2,
    projected: 165000,
    collectionRate: 73,
    ...overrides,
  };
}

function dashboard(
  overrides: Partial<FinanceDashboard> = {},
): FinanceDashboard {
  return {
    period: "2026-04",
    previousPeriod: "2026-03",
    currencies: ["CLP"],
    indicators: [indicators()],
    movements: [
      {
        id: "payment:1",
        membershipId: "m-1",
        studentId: "s-1",
        studentName: "Ana Pérez",
        planName: "Mensual",
        date: "2026-04-10",
        amount: 30000,
        currency: "CLP",
        status: "paid",
      },
      {
        id: "pending:2",
        membershipId: "m-2",
        studentId: "s-2",
        studentName: "Luis Rojas",
        planName: "Trimestral",
        date: "2026-04-02",
        amount: 15000,
        currency: "CLP",
        status: "overdue",
      },
    ],
    planPerformance: [
      {
        planId: "p-1",
        planName: "Mensual",
        currency: "CLP",
        studentCount: 3,
        monthlyAmount: 90000,
        share: 75,
      },
      {
        planId: "p-2",
        planName: "Trimestral",
        currency: "CLP",
        studentCount: 1,
        monthlyAmount: 30000,
        share: 25,
      },
    ],
    actionItems: [],
    ...overrides,
  };
}

function renderSummary(
  props: Partial<Parameters<typeof FinanceSummary>[0]> = {},
) {
  return render(
    <FinanceSummary
      dashboard={dashboard()}
      currency="CLP"
      today="2026-04-15"
      canManage
      linkParams={{ period: "2026-04" }}
      {...props}
    />,
  );
}

function card(name: string) {
  return screen.getByRole("heading", { name }).closest("a") as HTMLElement;
}

afterEach(cleanup);

describe("FinanceSummary", () => {
  it("shows the four indicators with values, semantic badges and filtered destinations", () => {
    renderSummary();

    const collected = card("Cobrado del mes");
    expect(within(collected).getByText("$120.000")).toBeTruthy();
    expect(within(collected).getByText("+20 %")).toBeTruthy();
    expect(within(collected).getByText("Mes anterior: $100.000")).toBeTruthy();
    // Now links to the collections sub-route instead of ?section=collections
    expect(collected.getAttribute("href")).toContain(
      "/dashboard/finance/collections",
    );

    const pending = card("Por cobrar");
    expect(within(pending).getByText("$45.000")).toBeTruthy();
    expect(within(pending).getByText("1 en mora")).toBeTruthy();
    expect(
      within(pending).getByText("$30.000 en mora · 2 cuentas"),
    ).toBeTruthy();
    expect(pending.getAttribute("href")).toContain("status=past_due");
    // No longer needs period= in the collections link (sub-route handles its own period)
    expect(pending.getAttribute("href")).toContain(
      "/dashboard/finance/collections",
    );

    const memberships = card("Membresías vigentes");
    expect(within(memberships).getByText("4")).toBeTruthy();
    expect(within(memberships).getByText("+2 altas")).toBeTruthy();
    expect(memberships.getAttribute("href")).toBe("/dashboard/students");

    const projected = card("Proyectado");
    expect(within(projected).getByText("$165.000")).toBeTruthy();
    expect(within(projected).getByText("73 % cobrado")).toBeTruthy();
    // Now links to the plans sub-route instead of ?section=plans
    expect(projected.getAttribute("href")).toContain(
      "/dashboard/finance/plans",
    );
  });

  it("reports the variation as unavailable without a previous baseline", () => {
    renderSummary({
      dashboard: dashboard({
        indicators: [indicators({ variation: null, previousCollected: 0 })],
      }),
    });

    expect(within(card("Cobrado del mes")).getByText("Sin base")).toBeTruthy();
  });

  it("marks a negative variation and an up-to-date pending card", () => {
    renderSummary({
      dashboard: dashboard({
        indicators: [indicators({ variation: -12.5, overdueStudents: 0 })],
      }),
    });

    expect(within(card("Cobrado del mes")).getByText("-12,5 %")).toBeTruthy();
    expect(within(card("Por cobrar")).getByText("Al día")).toBeTruthy();
  });

  it("lists recent movements with date, student, plan, amount and status", () => {
    renderSummary();

    const table = screen.getByRole("table", { name: "Movimientos recientes" });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual(["Fecha", "Alumno", "Plan", "Monto", "Estado"]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("10 abr 2026")).toBeTruthy();
    expect(
      within(rows[0])
        .getByRole("link", { name: "Ana Pérez" })
        .getAttribute("href"),
    ).toBe("/dashboard/students/s-1");
    expect(within(rows[0]).getByText("Pagado")).toBeTruthy();
    expect(within(rows[1]).getByText("En mora")).toBeTruthy();
  });

  it("shows plan performance with a textual share, not only a bar", () => {
    renderSummary();

    const list = screen.getByRole("list", {
      name: "Planes por ingreso mensual",
    });
    const items = within(list).getAllByRole("listitem");
    expect(within(items[0]).getByText("Mensual")).toBeTruthy();
    expect(within(items[0]).getByText("75 %")).toBeTruthy();
    expect(
      within(items[0]).getByText(/3 alumnos · \$90\.000 al mes/),
    ).toBeTruthy();
    expect(within(items[1]).getByText(/1 alumno · /)).toBeTruthy();
  });

  it("shows zeros and empty states with create and assign actions for an empty period", () => {
    renderSummary({
      dashboard: dashboard({
        currencies: [],
        indicators: [],
        movements: [],
        planPerformance: [],
      }),
    });

    expect(
      within(card("Cobrado del mes")).getAllByText("$0").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Sin movimientos todavía")).toBeTruthy();
    expect(screen.getByText("Ningún plan con alumnos vigentes")).toBeTruthy();
    const assignLinks = screen.getAllByRole("link", { name: "Asignar plan" });
    expect(assignLinks).toHaveLength(2);
    expect(assignLinks[0].getAttribute("href")).toContain("assign=1");
    expect(
      screen.getByRole("link", { name: "Crear plan" }).getAttribute("href"),
    ).toContain("/dashboard/finance/plans");
    expect(screen.getByLabelText("Mes")).toBeTruthy();
  });

  it("hides management actions in empty states for assistants", () => {
    renderSummary({
      canManage: false,
      dashboard: dashboard({ movements: [], planPerformance: [] }),
    });

    expect(screen.queryByRole("link", { name: "Asignar plan" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Crear plan" })).toBeNull();
  });

  it("offers a currency switcher and never mixes currencies", () => {
    const usd = indicators({ currency: "USD", collected: 250, projected: 400 });
    renderSummary({
      currency: "USD",
      linkParams: { period: "2026-04", currency: "USD" },
      dashboard: dashboard({
        currencies: ["CLP", "USD"],
        indicators: [indicators(), usd],
      }),
    });

    const switcher = screen.getByRole("navigation", { name: "Moneda" });
    expect(
      within(switcher)
        .getByRole("link", { name: "USD" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      within(switcher).getByRole("link", { name: "CLP" }).getAttribute("href"),
    ).toContain("currency=CLP");
    expect(within(card("Cobrado del mes")).getByText("US$250,00")).toBeTruthy();
    expect(screen.queryByText("Ana Pérez")).toBeNull();
    expect(screen.getByText("Sin movimientos todavía")).toBeTruthy();
    const hiddenCurrency = document.querySelector(
      'input[type="hidden"][name="currency"]',
    ) as HTMLInputElement;
    expect(hiddenCurrency.value).toBe("USD");
  });

  it("hides the currency switcher with a single currency", () => {
    renderSummary();

    expect(screen.queryByRole("navigation", { name: "Moneda" })).toBeNull();
  });
});
