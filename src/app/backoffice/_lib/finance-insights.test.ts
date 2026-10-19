import { describe, expect, it } from "vitest";
import type { SaasFinancialMetric } from "@/domain/saas-administration/financial-dashboard";
import {
  collectionBreakdown,
  formatDelta,
  percentChange,
  pickPrimaryMetric,
  previousPeriod,
  resolvePeriod,
} from "./finance-insights";

function metric(overrides: Partial<SaasFinancialMetric>): SaasFinancialMetric {
  return {
    currency: "CLP",
    mrr: 0,
    arr: 0,
    arpa: 0,
    recurringTenants: 0,
    churnedTenants: 0,
    churnRate: 0,
    trialsEnded: 0,
    trialsConverted: 0,
    trialConversionRate: 0,
    collectedNet: 0,
    pendingAmount: 0,
    pastDueAmount: 0,
    pastDueTenants: 0,
    ...overrides,
  };
}

describe("finance insights", () => {
  it("resolves valid periods and falls back to the current UTC month", () => {
    expect(resolvePeriod("2026-03")).toBe("2026-03");
    expect(resolvePeriod("2026-13", new Date("2026-10-17T12:00:00Z"))).toBe(
      "2026-10",
    );
  });

  it("computes the previous month across year boundaries", () => {
    expect(previousPeriod("2026-10")).toBe("2026-09");
    expect(previousPeriod("2026-01")).toBe("2025-12");
  });

  it("returns no delta without a baseline and signs positive changes", () => {
    expect(percentChange(100, undefined)).toBeNull();
    expect(percentChange(100, 0)).toBeNull();
    expect(formatDelta(percentChange(114, 100))).toBe("+14%");
    expect(formatDelta(percentChange(90, 100))).toBe("-10%");
    expect(formatDelta(null)).toBeNull();
  });

  it("prefers the requested currency, otherwise the highest MRR", () => {
    const metrics = [
      metric({ currency: "USD", mrr: 10 }),
      metric({ currency: "CLP", mrr: 500 }),
    ];
    expect(pickPrimaryMetric(metrics)?.currency).toBe("CLP");
    expect(pickPrimaryMetric(metrics, "USD")?.currency).toBe("USD");
    expect(pickPrimaryMetric([])).toBeNull();
  });

  it("splits billing into collected, pending and past-due shares", () => {
    const breakdown = collectionBreakdown(
      metric({ collectedNet: 50, pendingAmount: 30, pastDueAmount: 20 }),
    );
    expect(breakdown.total).toBe(100);
    expect(breakdown.collectedShare).toBe(50);
    expect(breakdown.pendingShare).toBe(30);
    expect(breakdown.pastDueShare).toBe(20);
    expect(collectionBreakdown(metric({})).collectedShare).toBe(0);
  });
});
