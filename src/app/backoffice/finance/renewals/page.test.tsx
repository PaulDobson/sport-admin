import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import RenewalProcessorPage from "./page";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), status: vi.fn() }));
vi.mock("../../_lib/backoffice-context", () => ({
  loadBackofficeContext: async () => ({ shell: {}, deps: { renewals: { isPlatformAdmin: mocks.admin, getStatus: mocks.status } } }),
}));
vi.mock("@/infrastructure/composition/saas-renewal-composition", () => ({
  getSaasRenewalConfiguration: () => ({ enabled: false, schedulerConfigured: false }),
}));
vi.mock("@/presentation/components/backoffice-shell", () => ({ BackofficeShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
beforeEach(() => {
  vi.resetAllMocks(); mocks.admin.mockResolvedValue(true);
  mocks.status.mockResolvedValue({ businessDate: "2028-02-29", lastRunAt: null, lastWorkerRunAt: null, dueCount: 0, failures: [], blockedChanges: [] });
});
afterEach(cleanup);
describe("renewal console", () => {
  it("reads audited status but never starts a renewal from GET", async () => {
    render(await RenewalProcessorPage());
    expect(mocks.status).toHaveBeenCalledWith(null);
    expect(screen.getByRole("heading", { name: "Procesador de renovaciones" })).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Desactivado: no procesa renovaciones")).toBeTruthy();
  });
  it("shows actionable missing-schema errors instead of invented counters", async () => {
    mocks.status.mockRejectedValueOnce(new BusinessRuleViolationError("Instala la migración 0047"));
    render(await RenewalProcessorPage());
    expect(screen.getByRole("alert").textContent).toContain("0047");
    expect(screen.getByText("Consulta no disponible")).toBeTruthy();
  });
  it("does not suppress authorization errors", async () => {
    mocks.admin.mockResolvedValue(false);
    await expect(RenewalProcessorPage()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.status).not.toHaveBeenCalled();
  });
});
