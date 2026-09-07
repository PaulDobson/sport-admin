import { BusinessRuleViolationError } from "@/domain/shared/errors";

export type BillingCycle = "monthly" | "quarterly" | "semiannual" | "annual";
export type StudentMembershipStatus =
  | "active"
  | "paused"
  | "past_due"
  | "expired"
  | "cancelled";
export type MembershipTransition = "pause" | "renew" | "expire" | "cancel";

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
