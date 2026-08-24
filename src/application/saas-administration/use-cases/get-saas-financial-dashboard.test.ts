import { describe, expect, it } from "vitest";
import type { SaasFinancialDashboardPort } from "../ports/saas-financial-dashboard-port";
import { UnauthorizedError, ValidationError } from "@/domain/shared/errors";
import { getSaasFinancialDashboard } from "./get-saas-financial-dashboard";

class FakeSaasFinancialDashboard implements SaasFinancialDashboardPort {
  isAdmin = true;
  requestedPeriod: string | null = null;

  async isPlatformAdmin() {
    return this.isAdmin;
  }

  async getMonthlyMetrics(periodStart: string) {
    this.requestedPeriod = periodStart;
    return [];
  }
}

describe("get SaaS financial dashboard", () => {
  it("loads a validated calendar month", async () => {
    const dashboard = new FakeSaasFinancialDashboard();

    await expect(
      getSaasFinancialDashboard("2026-08", dashboard),
    ).resolves.toEqual([]);
    expect(dashboard.requestedPeriod).toBe("2026-08-01");
  });

  it("rejects invalid periods", async () => {
    const dashboard = new FakeSaasFinancialDashboard();
    await expect(
      getSaasFinancialDashboard("2026-13", dashboard),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects tenant administrators", async () => {
    const dashboard = new FakeSaasFinancialDashboard();
    dashboard.isAdmin = false;
    await expect(
      getSaasFinancialDashboard("2026-08", dashboard),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
