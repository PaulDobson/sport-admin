import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { TenantBackofficeSummary } from "@/domain/saas-administration/tenant-backoffice";
import TenantBackofficePage from "./page";

const mocks = vi.hoisted(() => ({ list: vi.fn(), history: vi.fn(), entitlements: vi.fn() }));
vi.mock("../_lib/backoffice-context", () => ({
  loadBackofficeContext: async () => ({
    shell: {}, deps: { tenantBackoffice: { isPlatformAdmin: async () => true, listTenants: mocks.list, getStatusHistory: mocks.history, getEntitlements: mocks.entitlements, listPlans: async () => [] } },
  }),
}));
vi.mock("@/presentation/components/backoffice-shell", () => ({ BackofficeShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("./tenant-status-form", () => ({ TenantStatusForm: () => <div>Cambiar estado</div> }));
vi.mock("./plan-limits-form", () => ({ PlanLimitsForm: () => null }));
const tenant: TenantBackofficeSummary = {
  id: "e0000000-0000-4000-8000-000000000001", name: "Academia", status: "active", createdAt: new Date("2026-01-01"),
  contactName: "Ana Principal", contactEmail: "principal@example.cl", phone: "+56 9 1234 5678",
  address: "Av. Central 123", city: "Santiago", region: "Metropolitana",
  billingContactName: "Pedro Facturación", billingContactEmail: "pagos@example.cl",
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([tenant]);
  mocks.history.mockResolvedValue([]);
  mocks.entitlements.mockResolvedValue(null);
});

describe("Tenant backoffice details", () => {
  it("shows gym details and billing as distinct sections", async () => {
    render(await TenantBackofficePage({ searchParams: Promise.resolve({ tenant: tenant.id }) }));
    const detail = within(screen.getByRole("complementary", { name: "Detalle del tenant" }));
    for (const value of ["Ana Principal", "principal@example.cl", "+56 9 1234 5678", "Av. Central 123", "Santiago", "Metropolitana", "Pedro Facturación", "pagos@example.cl"]) {
      expect(detail.getByText(value)).toBeTruthy();
    }
    expect(detail.getByRole("heading", { name: "Contacto principal" })).toBeTruthy();
    expect(detail.getByRole("heading", { name: "Facturación" })).toBeTruthy();
    const table = within(screen.getByRole("table"));
    expect(table.getByText("principal@example.cl")).toBeTruthy();
    expect(table.queryByText("pagos@example.cl")).toBeNull();
    const mobileList = within(screen.getByRole("list", { name: "Listado de tenants" }));
    expect(mobileList.getByText("principal@example.cl")).toBeTruthy();
    expect(mobileList.queryByText("pagos@example.cl")).toBeNull();
  });
  it("shows the main contact name in desktop and mobile when email is empty", async () => {
    mocks.list.mockResolvedValue([{ ...tenant, contactEmail: null }]);
    render(await TenantBackofficePage({ searchParams: Promise.resolve({}) }));
    expect(within(screen.getByRole("table")).getByText("Ana Principal")).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Listado de tenants" })).getByText("Ana Principal")).toBeTruthy();
  });
  it("keeps incomplete academies visible without substituting billing data", async () => {
    mocks.list.mockResolvedValue([{ ...tenant, address: null, contactName: null, contactEmail: null, phone: null, city: null, region: null }]);
    render(await TenantBackofficePage({ searchParams: Promise.resolve({ tenant: tenant.id }) }));
    const detail = within(screen.getByRole("complementary", { name: "Detalle del tenant" }));
    expect(detail.getByText("Sin nombre de contacto principal")).toBeTruthy();
    expect(detail.getByText("Sin email de contacto principal")).toBeTruthy();
    expect(detail.getByText("Sin teléfono registrado")).toBeTruthy();
    expect(detail.getByText("Sin dirección registrada")).toBeTruthy();
    expect(detail.getByText("Sin ciudad registrada")).toBeTruthy();
    expect(detail.getByText("Sin región registrada")).toBeTruthy();
    expect(within(screen.getByRole("table")).getByText("Sin contacto principal")).toBeTruthy();
  });
  it("filters the portfolio by main contact and location", async () => {
    render(await TenantBackofficePage({ searchParams: Promise.resolve({ q: "Metropolitana" }) }));
    expect(within(screen.getByRole("table")).getByText("Academia")).toBeTruthy();
  });
  it("propagates database errors to the route boundary", async () => {
    mocks.list.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(TenantBackofficePage({ searchParams: Promise.resolve({}) })).rejects.toThrow("Database unavailable");
  });
});
