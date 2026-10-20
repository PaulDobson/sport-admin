import type { SaasFinancialMetric } from "@/domain/saas-administration/financial-dashboard";

export const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export function resolvePeriod(value: string | undefined, now = new Date()) {
  return value && periodPattern.test(value)
    ? value
    : now.toISOString().slice(0, 7);
}

export function previousPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
}

export function formatPeriodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Percentage change; null when there is no baseline to compare against. */
export function percentChange(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatDelta(delta: number | null) {
  if (delta === null) return null;
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("es-CL", { maximumFractionDigits: 1 })}%`;
}

export function formatRate(rate: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(rate / 100);
}

/** Picks the requested currency or the one with highest MRR, so figures are never mixed. */
export function pickPrimaryMetric(
  metrics: SaasFinancialMetric[],
  preferredCurrency?: string,
) {
  const preferred = metrics.find(
    (metric) => metric.currency === preferredCurrency,
  );
  if (preferred) return preferred;
  return [...metrics].sort((left, right) => right.mrr - left.mrr)[0] ?? null;
}

export function collectionBreakdown(metric: SaasFinancialMetric) {
  const collected = Math.max(metric.collectedNet, 0);
  const total = collected + metric.pendingAmount + metric.pastDueAmount;
  const share = (value: number) => (total > 0 ? (value / total) * 100 : 0);
  return {
    total,
    collectedShare: share(collected),
    pendingShare: share(metric.pendingAmount),
    pastDueShare: share(metric.pastDueAmount),
  };
}
