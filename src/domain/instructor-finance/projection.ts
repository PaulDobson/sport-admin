import type { BillingCycle, StudentMembershipStatus } from "./membership";
import type { FinancialAdjustment, MembershipPayment } from "./payment";

export interface ProjectionMembership {
  id: string;
  startsOn: string;
  expiresOn: string;
  agreedPrice: number;
  currency: string;
  billingCycle: BillingCycle;
  status: StudentMembershipStatus;
  expirationGraceDays: number;
}

export interface MonthlyFinancialProjection {
  period: string;
  currency: string;
  contractedAmount: number;
  collectibleAmount: number;
  collectedAmount: number;
}

const cycleMonths: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function monthBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = `${period}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function isCurrentDuringPeriod(
  membership: ProjectionMembership,
  start: string,
  end: string,
) {
  if (membership.status === "active") {
    return membership.startsOn <= end && membership.expiresOn >= start;
  }
  if (membership.status !== "past_due" || membership.startsOn > end)
    return false;
  const graceEnd = new Date(`${membership.expiresOn}T00:00:00Z`);
  graceEnd.setUTCDate(graceEnd.getUTCDate() + membership.expirationGraceDays);
  return graceEnd.toISOString().slice(0, 10) >= start;
}

export function calculateMonthlyFinancialProjections(input: {
  period: string;
  memberships: ProjectionMembership[];
  payments: MembershipPayment[];
  adjustments: FinancialAdjustment[];
}): MonthlyFinancialProjection[] {
  const { start, end } = monthBounds(input.period);
  const projections = new Map<string, MonthlyFinancialProjection>();
  const currentMembershipIds = new Set<string>();
  const getProjection = (currency: string) => {
    const existing = projections.get(currency);
    if (existing) return existing;
    const created = {
      period: input.period,
      currency,
      contractedAmount: 0,
      collectibleAmount: 0,
      collectedAmount: 0,
    };
    projections.set(currency, created);
    return created;
  };

  for (const membership of uniqueById(input.memberships)) {
    if (!isCurrentDuringPeriod(membership, start, end)) continue;
    currentMembershipIds.add(membership.id);
    const projection = getProjection(membership.currency);
    const monthlyAmount =
      membership.agreedPrice / cycleMonths[membership.billingCycle];
    projection.contractedAmount += monthlyAmount;
    projection.collectibleAmount += monthlyAmount;
  }
  for (const adjustment of uniqueById(input.adjustments)) {
    if (
      !currentMembershipIds.has(adjustment.membershipId) ||
      adjustment.effectiveOn < start ||
      adjustment.effectiveOn > end
    ) {
      continue;
    }
    const projection = getProjection(adjustment.currency);
    projection.collectibleAmount +=
      adjustment.kind === "tax" ? adjustment.amount : -adjustment.amount;
  }
  for (const payment of uniqueById(input.payments)) {
    const paidOn = payment.paidAt?.toISOString().slice(0, 10);
    if (
      payment.status !== "paid" ||
      !paidOn ||
      paidOn < start ||
      paidOn > end
    ) {
      continue;
    }
    getProjection(payment.currency).collectedAmount += payment.amount;
  }

  return [...projections.values()]
    .map((projection) => ({
      ...projection,
      contractedAmount: roundCurrency(projection.contractedAmount),
      collectibleAmount: roundCurrency(projection.collectibleAmount),
      collectedAmount: roundCurrency(projection.collectedAmount),
    }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
}
