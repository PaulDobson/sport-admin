import type { CollectionItem } from "./collection";
import type { BillingCycle } from "./membership";
import {
  cycleMonths,
  isCurrentDuringPeriod,
  monthBounds,
  type ProjectionMembership,
} from "./projection";

function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/** Percentage change against the previous period; `null` when there is no baseline. */
export function periodVariation(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Collected over collectible, as an integer percentage capped at 100. */
export function collectionRate(collected: number, collectible: number) {
  if (collectible <= 0) return collected > 0 ? 100 : 0;
  return Math.min(100, Math.round((collected / collectible) * 100));
}

export function monthlyEquivalent(price: number, cycle: BillingCycle) {
  return roundCurrency(price / cycleMonths[cycle]);
}

export function previousPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return date.toISOString().slice(0, 7);
}

export function currentMembershipsInPeriod(
  memberships: ProjectionMembership[],
  period: string,
) {
  const { start, end } = monthBounds(period);
  const seen = new Set<string>();
  return memberships.filter((membership) => {
    if (seen.has(membership.id)) return false;
    seen.add(membership.id);
    return isCurrentDuringPeriod(membership, start, end);
  });
}

/** Memberships whose start date falls inside the period ("altas"). */
export function countNewMemberships(
  memberships: ProjectionMembership[],
  period: string,
  currency?: string,
) {
  const { start, end } = monthBounds(period);
  return new Set(
    memberships
      .filter(
        (membership) =>
          (!currency || membership.currency === currency) &&
          membership.startsOn >= start &&
          membership.startsOn <= end,
      )
      .map((membership) => membership.id),
  ).size;
}

export interface PlanPerformance {
  planId: string;
  planName: string;
  currency: string;
  studentCount: number;
  monthlyAmount: number;
  share: number;
}

/** Groups current memberships by plan using each membership's agreed price. */
export function summarizePlanPerformance(
  memberships: ProjectionMembership[],
  period: string,
): PlanPerformance[] {
  const groups = new Map<string, Omit<PlanPerformance, "share">>();
  for (const membership of currentMembershipsInPeriod(memberships, period)) {
    const key = `${membership.planId}:${membership.currency}`;
    const group = groups.get(key) ?? {
      planId: membership.planId,
      planName: membership.planName,
      currency: membership.currency,
      studentCount: 0,
      monthlyAmount: 0,
    };
    group.studentCount += 1;
    group.monthlyAmount +=
      membership.agreedPrice / cycleMonths[membership.billingCycle];
    groups.set(key, group);
  }
  const totals = new Map<string, number>();
  for (const group of groups.values()) {
    totals.set(
      group.currency,
      (totals.get(group.currency) ?? 0) + group.monthlyAmount,
    );
  }
  return [...groups.values()]
    .map((group) => {
      const total = totals.get(group.currency) ?? 0;
      return {
        ...group,
        monthlyAmount: roundCurrency(group.monthlyAmount),
        share: total > 0 ? Math.round((group.monthlyAmount / total) * 100) : 0,
      };
    })
    .sort(
      (left, right) =>
        left.currency.localeCompare(right.currency) ||
        right.monthlyAmount - left.monthlyAmount ||
        left.planName.localeCompare(right.planName),
    );
}

export type MovementStatus = "paid" | "pending" | "overdue";

export interface RecentPayment {
  id: string;
  membershipId: string;
  studentId: string;
  studentName: string;
  planName: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded" | "voided";
  paidAt?: Date;
}

export interface RecentMovement {
  id: string;
  membershipId: string;
  studentId: string;
  studentName: string;
  planName: string;
  date: string;
  amount: number;
  currency: string;
  status: MovementStatus;
}

/** Paid payments plus outstanding balances, newest first, never counting voided money as paid. */
export function mergeRecentMovements(
  payments: RecentPayment[],
  pending: CollectionItem[],
  limit: number,
): RecentMovement[] {
  const paid: RecentMovement[] = payments
    .filter((payment) => payment.status === "paid" && payment.paidAt)
    .map((payment) => ({
      id: `payment:${payment.id}`,
      membershipId: payment.membershipId,
      studentId: payment.studentId,
      studentName: payment.studentName,
      planName: payment.planName,
      date: payment.paidAt!.toISOString().slice(0, 10),
      amount: payment.amount,
      currency: payment.currency,
      status: "paid",
    }));
  const outstanding: RecentMovement[] = pending.map((item) => ({
    id: `pending:${item.membershipId}`,
    membershipId: item.membershipId,
    studentId: item.studentId,
    studentName: item.studentName,
    planName: item.planName,
    date: item.dueOn,
    amount: item.balance,
    currency: item.currency,
    status: item.isOverdue ? "overdue" : "pending",
  }));
  return [...paid, ...outstanding]
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        left.studentName.localeCompare(right.studentName),
    )
    .slice(0, limit);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Mirrors SQL `membership_cycle_end`: start + cycle (clamped to month end) - 1 day. */
export function cycleEnd(startsOn: string, cycle: BillingCycle) {
  const [year, month, day] = startsOn.split("-").map(Number);
  const targetMonthIndex = month - 1 + cycleMonths[cycle];
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const targetDay = Math.min(day, daysInMonth(targetYear, normalizedMonth));
  const date = new Date(Date.UTC(targetYear, normalizedMonth, targetDay));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** Renewal starts at the later of the next billing date and the effective date, as in SQL. */
export function renewalExpiresOn(input: {
  nextBillingDate: string;
  effectiveOn: string;
  cycle: BillingCycle;
}) {
  const start =
    input.nextBillingDate > input.effectiveOn
      ? input.nextBillingDate
      : input.effectiveOn;
  return cycleEnd(start, input.cycle);
}
