import { BusinessRuleViolationError } from "@/domain/shared/errors";

export type BillingCycle = "monthly" | "quarterly" | "semiannual" | "annual";
export type StudentMembershipStatus =
  | "active"
  | "paused"
  | "past_due"
  | "expired"
  | "cancelled";
export type MembershipTransition = "pause" | "renew" | "expire" | "cancel";

/**
 * Number of days in each billing cycle used for pro-rata calculations.
 * These are calendar-approximate values (monthly = 30, annual = 365).
 */
export const cycleDays: Record<BillingCycle, number> = {
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
  annual: 365,
};

export interface PlanDifferential {
  /** Actual days elapsed since the membership started (capped at cycle length). */
  elapsedDays: number;
  /** Total days in the current billing cycle. */
  cycleDays: number;
  /** How much of the current plan price has been "consumed" (elapsed × daily rate). */
  consumedValue: number;
  /** Remaining unused value of the current plan (credit towards the new plan). */
  unusedCredit: number;
  /** Full price of the new plan. */
  newPlanPrice: number;
  /**
   * Amount the student must pay to switch now.
   *   > 0  → upgrade: student owes this amount
   *   = 0  → break-even
   *   < 0  → downgrade: student has credit (to be applied as a `credit` adjustment)
   */
  differential: number;
}

/**
 * Calculates the pro-rata differential when switching an in-progress plan.
 *
 * The logic:
 *   dailyRate      = currentAgreedPrice / cycleDays[currentBillingCycle]
 *   consumed       = min(elapsedDays, cycleDays) × dailyRate
 *   unusedCredit   = currentAgreedPrice − consumed
 *   differential   = newPlanPrice − unusedCredit
 *
 * @param currentAgreedPrice  Price actually agreed for the current membership
 * @param currentBillingCycle Billing cycle of the current membership
 * @param startsOn            ISO date when the current membership started
 * @param changeOn            ISO date when the plan change takes effect (today)
 * @param newPlanPrice        Full price of the new plan (same currency assumed)
 */
export function calculatePlanDifferential(
  currentAgreedPrice: number,
  currentBillingCycle: BillingCycle,
  startsOn: string,
  changeOn: string,
  newPlanPrice: number,
): PlanDifferential {
  const totalDays = cycleDays[currentBillingCycle];
  const startDate = new Date(`${startsOn}T00:00:00Z`);
  const changeDate = new Date(`${changeOn}T00:00:00Z`);
  const msPerDay = 1000 * 60 * 60 * 24;
  const rawElapsed = Math.max(
    0,
    Math.floor((changeDate.getTime() - startDate.getTime()) / msPerDay),
  );
  const elapsedDays = Math.min(rawElapsed, totalDays);

  const dailyRate = currentAgreedPrice / totalDays;
  const consumedValue = Math.round(dailyRate * elapsedDays * 100) / 100;
  const unusedCredit =
    Math.round((currentAgreedPrice - consumedValue) * 100) / 100;
  const differential = Math.round((newPlanPrice - unusedCredit) * 100) / 100;

  return {
    elapsedDays,
    cycleDays: totalDays,
    consumedValue,
    unusedCredit,
    newPlanPrice,
    differential,
  };
}

export type MembershipPlanStatus = "active" | "archived";

export interface MembershipPlan {
  id: string;
  tenantId: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  expirationGraceDays: number;
  benefits: string[];
  status: MembershipPlanStatus;
  membershipCount?: number;
}

export function isPlanAssignable(plan: MembershipPlan) {
  return plan.status === "active";
}

export function assertPlanAssignable(plan: MembershipPlan) {
  if (!isPlanAssignable(plan)) {
    throw new BusinessRuleViolationError(
      "Cannot assign an archived membership plan",
    );
  }
}

export interface StudentMembership {
  id: string;
  tenantId: string;
  studentId: string;
  planId: string;
  startsOn: string;
  expiresOn: string;
  nextBillingDate: string;
  agreedPrice: number;
  currency: string;
  billingCycle: BillingCycle;
  expirationGraceDays: number;
  status: StudentMembershipStatus;
  pastDueSince?: string;
  pausedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const allowedTransitions: Record<
  MembershipTransition,
  StudentMembershipStatus[]
> = {
  pause: ["active", "past_due"],
  renew: ["active", "paused", "past_due", "expired"],
  expire: ["active", "past_due"],
  cancel: ["active", "paused", "past_due", "expired"],
};

export function assertMembershipTransition(
  currentStatus: StudentMembershipStatus,
  transition: MembershipTransition,
) {
  if (!allowedTransitions[transition].includes(currentStatus)) {
    throw new BusinessRuleViolationError(
      `Cannot ${transition} a membership with status ${currentStatus}`,
    );
  }
}

export function isMembershipCurrent(
  membership: StudentMembership,
  onDate: string,
) {
  if (membership.status === "active") {
    return onDate >= membership.startsOn && onDate <= membership.expiresOn;
  }
  if (membership.status !== "past_due") return false;
  const graceEnd = new Date(`${membership.expiresOn}T00:00:00Z`);
  graceEnd.setUTCDate(graceEnd.getUTCDate() + membership.expirationGraceDays);
  return onDate <= graceEnd.toISOString().slice(0, 10);
}
