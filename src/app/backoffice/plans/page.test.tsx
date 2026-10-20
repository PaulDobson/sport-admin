import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import SaasPlansPage from "./page";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../_lib/backoffice-context", () => ({
  loadBackofficeContext: async () => ({ shell: {}, deps: { planCatalog: { isPlatformAdmin: async () => true, list: mocks.list } } }),
}));
vi.mock("@/presentation/components/backoffice-shell", () => ({ BackofficeShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("./plan-form", () => ({
  PlanForm: () => <div>Editor de condiciones</div>,
  ArchivePlanForm: () => <div>Confirmar archivo</div>,
}));
const plan = {
  id: "plan", slug: "academia", status: "active",
  currentVersion: {
    id: "version", versionNumber: 2, name: "Academia Pro", description: "Soporte",
    price: 11900, currency: "CLP", durationUnit: "months", durationCount: 3,
    trialDays: 7, maxStudents: 100, maxUsers: 5, services: ["Capacitación"],
    features: ["reports"], legacy: false,
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([plan, { ...plan, id: "archived", status: "archived", currentVersion: { ...plan.currentVersion, name: "Antiguo" } }]);
});
afterEach(cleanup);

describe("SaaS plan catalog page", () => {
  it("provides desktop table with versioned terms and mobile cards", async () => {
    render(await SaasPlansPage({ searchParams: Promise.resolve({}) }));
    const table = within(screen.getByRole("table"));
    const activeRow = within(table.getByRole("row", { name: /Academia Pro/ }));
    expect(activeRow.getByText("Academia Pro")).toBeTruthy();
    expect(activeRow.getByText("Versión 2")).toBeTruthy();
    expect(activeRow.getByText(/11.900/)).toBeTruthy();
    expect(activeRow.getByText("100 alumnos")).toBeTruthy();
    expect(table.getByText("Antiguo")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Publicar nueva versión" })).toHaveLength(2);
  });
  it("filters catalog by state and search query without losing URL filters", async () => {
    render(await SaasPlansPage({ searchParams: Promise.resolve({ status: "active", q: "Pro" }) }));
    expect(within(screen.getByRole("table")).queryByText("Antiguo")).toBeNull();
    expect(screen.getByLabelText("Buscar plan")).toHaveProperty("value", "Pro");
    expect(screen.getByLabelText("Estado")).toHaveProperty("value", "active");
    expect(screen.getByRole("status").textContent).toBe("1 plan");
  });
  it("shows setup errors rather than an empty catalog or writable form", async () => {
    mocks.list.mockRejectedValue(new BusinessRuleViolationError("Faltan migraciones SaaS."));
    render(await SaasPlansPage({ searchParams: Promise.resolve({ new: "1" }) }));
    expect(screen.getByRole("alert").textContent).toContain("Faltan migraciones");
    expect(screen.queryByText("Editor de condiciones")).toBeNull();
    expect(screen.queryByText("Aún no hay planes")).toBeNull();
  });
  it("does not expose an editor for archived or nonexistent plans", async () => {
    render(await SaasPlansPage({ searchParams: Promise.resolve({ edit: "archived" }) }));
    expect(screen.getByRole("alert").textContent).toContain("no existe o está archivado");
    expect(screen.queryByText("Editor de condiciones")).toBeNull();
  });
  it("propagates unexpected storage errors instead of disguising them as setup warnings", async () => {
    mocks.list.mockRejectedValueOnce(new Error("offline"));
    await expect(SaasPlansPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("offline");
  });
});
