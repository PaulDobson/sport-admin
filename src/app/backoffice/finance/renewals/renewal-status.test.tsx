import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { RenewalProcessorStatus } from "@/domain/saas-administration/renewal-processing";
import { RenewalStatus } from "./renewal-status";
const now = "2028-02-29T12:00:00Z";
const configuration = { enabled: true, schedulerConfigured: true };
const status: RenewalProcessorStatus = {
  businessDate: "2028-02-29", lastRunAt: now, lastWorkerRunAt: now, dueCount: 2, failures: [], blockedChanges: [],
};
afterEach(cleanup);
describe("renewal processor readiness", () => {
  it("does not mistake configuration or a manual execution for worker readiness", () => {
    render(<RenewalStatus status={{ ...status, lastWorkerRunAt: null }} configuration={configuration} error={null} now={now} />);
    expect(screen.getByRole("alert").textContent).toContain("No hay actividad reciente");
    expect(screen.getByText("Configurado; no certifica despliegue")).toBeTruthy();
  });
  it("warns at more than 30 minutes, not at the exact threshold", () => {
    const { rerender } = render(<RenewalStatus status={{ ...status, lastWorkerRunAt: "2028-02-29T11:30:00Z" }} configuration={configuration} error={null} now={now} />);
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(<RenewalStatus status={{ ...status, lastWorkerRunAt: "2028-02-29T11:29:59Z" }} configuration={configuration} error={null} now={now} />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
  it("does not manufacture zero debt when the RPC schema is missing", () => {
    render(<RenewalStatus status={null} configuration={{ enabled: false, schedulerConfigured: false }} error="Instala 0047" now={now} />);
    expect(screen.getByText("Consulta no disponible")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Instala 0047");
  });
  it("shows durable failures and blocked-change notices with tenant task links", () => {
    render(<RenewalStatus configuration={configuration} error={null} now={now} status={{
      ...status, failures: [{
        subscriptionId: "sub", tenantId: "tenant", tenantName: "Academia error", periodStartsOn: "2028-02-29",
        attemptCount: 3, nextAttemptAt: null, errorCode: "22023",
      }], blockedChanges: [{
        id: "change", subscriptionId: "sub", tenantId: "tenant", tenantName: "Academia bloqueada",
        effectiveOn: "2028-02-29", blockedReason: "Uso excedido",
      }],
    }} />);
    expect(screen.getByRole("region", { name: "Renovaciones con error" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Avisos de cambios bloqueados" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Academia bloqueada" }).getAttribute("href")).toBe("/backoffice/tenants/tenant/subscription");
    expect(screen.getByText(/Reintentos automáticos agotados/)).toBeTruthy();
  });
});
