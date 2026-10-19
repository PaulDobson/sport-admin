import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import TenantSubscriptionPage from "./page";

const mocks = vi.hoisted(() => ({ management: vi.fn(), list: vi.fn(), form: vi.fn() }));
vi.mock("../../../_lib/backoffice-context", () => ({
  loadBackofficeContext: async () => ({
    shell: {}, deps: {
      subscriptions: { isPlatformAdmin: async () => true, getManagement: mocks.management },
      planCatalog: { isPlatformAdmin: async () => true, list: mocks.list },
    },
  }),
}));
vi.mock("@/presentation/components/backoffice-shell", () => ({ BackofficeShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("./assignment-form", () => ({ AssignmentForm: (props: unknown) => { mocks.form(props); return <div>Formulario de asignación</div>; } }));
vi.mock("@/infrastructure/composition/saas-renewal-composition", () => ({
  getSaasRenewalConfiguration: () => ({ enabled: false, schedulerConfigured: false }),
}));
const tenantId = "ad440000-0000-4000-8000-000000000001";
const context = { tenantId, tenantName: "Academia", tenantStatus: "active", businessDate: "2028-01-31", activeStudents: 10, activeUsers: 2, subscription: null, scheduledChange: null };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.management.mockResolvedValue(context);
  mocks.list.mockResolvedValue([]);
});
afterEach(cleanup);
describe("tenant subscription task page", () => {
  it("loads authoritative Chile business date and usage for initial assignment", async () => {
    render(await TenantSubscriptionPage({ params: Promise.resolve({ tenantId }) }));
    expect(screen.getByText(/10 alumnos.*2 usuarios/)).toBeTruthy();
    expect(mocks.form).toHaveBeenCalledWith(expect.objectContaining({ tenantId, businessDate: "2028-01-31" }));
    expect(screen.getByRole("link", { name: "Volver a Academia" }).getAttribute("href")).toBe(`/backoffice/tenants?tenant=${tenantId}`);
  });
  it("does not offer initial assignment or reload today's catalog over a historical contract", async () => {
    mocks.management.mockResolvedValue({ ...context, subscription: {
      id: "subscription", planId: "plan", planVersionId: "version", planName: "Contrato antiguo",
      status: "active", paymentStatus: "partial", startsOn: "2027-12-01", periodStartsOn: "2028-01-01",
      periodEndExclusive: "2028-02-01", nextBillingDate: "2028-02-01", price: 19.99,
      currency: "USD", durationUnit: "months", durationCount: 1,
    } });
    render(await TenantSubscriptionPage({ params: Promise.resolve({ tenantId }) }));
    expect(screen.getByText("Contrato antiguo")).toBeTruthy();
    expect(screen.getByText("Parcial histórico")).toBeTruthy();
    expect(screen.queryByText("Formulario de asignación")).toBeNull();
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("reports missing migration without offering a writable form", async () => {
    mocks.management.mockRejectedValueOnce(new BusinessRuleViolationError("Verifica las migraciones 0044 y 0045."));
    render(await TenantSubscriptionPage({ params: Promise.resolve({ tenantId }) }));
    expect(screen.getByRole("alert").textContent).toContain("0044 y 0045");
    expect(mocks.form).not.toHaveBeenCalled();
  });
  it("shows a pending downgrade and its cancellation rather than a competing commercial action", async () => {
    mocks.management.mockResolvedValue({ ...context, subscription: {
      id: "subscription", planId: "plan", planVersionId: "version", planName: "Contrato Pro",
      status: "active", paymentStatus: "pending", startsOn: "2028-01-01", periodStartsOn: "2028-01-01",
      periodEndExclusive: "2028-02-01", nextBillingDate: "2028-02-01", price: 60000,
      currency: "CLP", durationUnit: "days", durationCount: 30,
    }, scheduledChange: {
      id: "change", planName: "Base", price: 30000, currency: "CLP", effectiveOn: "2028-02-01", status: "scheduled",
      reason: "Solicitud del cliente", blockedReason: null,
    } });
    render(await TenantSubscriptionPage({ params: Promise.resolve({ tenantId }) }));
    expect(screen.getByRole("heading", { name: "Cambio programado" })).toBeTruthy();
    expect(screen.getByRole("form", { name: "Cancelar cambio programado" })).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Cambio contractual de plan" })).toBeNull();
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("offers a disabled renewal task instead of a stale plan-change preview for an overdue period", async () => {
    mocks.management.mockResolvedValue({ ...context, subscription: {
      id: "subscription", planId: "plan", planVersionId: "version", planName: "Contrato Pro",
      status: "active", paymentStatus: "pending", startsOn: "2028-01-01", periodStartsOn: "2028-01-01",
      periodEndExclusive: "2028-01-31", nextBillingDate: "2028-01-31", price: 60000,
      currency: "CLP", durationUnit: "days", durationCount: 30,
    } });
    render(await TenantSubscriptionPage({ params: Promise.resolve({ tenantId }) }));
    expect(screen.getByRole("heading", { name: "Renovar un período vencido" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("desactivadas");
    expect(screen.queryByRole("form", { name: "Cambio contractual de plan" })).toBeNull();
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
