import { randomUUID } from "node:crypto";
import { NotFoundError } from "@/domain/shared/errors";
import {
  assertMembershipTransition,
  type BillingCycle,
  type MembershipPlan,
  type StudentMembership,
} from "@/domain/instructor-finance/membership";
import type {
  CreateMembershipInput,
  CreateMembershipPlanInput,
  MembershipRepositoryPort,
  TransitionMembershipInput,
} from "../ports/membership-repository-port";

interface FakePlan extends Omit<MembershipPlan, "name"> {
  name?: string;
}

function addCycle(date: string, cycle: BillingCycle) {
  const source = new Date(`${date}T00:00:00Z`);
  const months = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 }[cycle];
  const targetMonth = source.getUTCMonth() + months;
  const targetYear = source.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, normalizedMonth + 1, 0),
  ).getUTCDate();
  const result = new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      Math.min(source.getUTCDate(), lastDay),
    ),
  );
  return result.toISOString().slice(0, 10);
}

export class FakeMembershipRepository implements MembershipRepositoryPort {
  readonly plans: FakePlan[] = [];
  readonly memberships: StudentMembership[] = [];
  readonly events: Array<{ type: string; operationId: string }> = [];

  async createPlan(input: CreateMembershipPlanInput) {
    const plan = { id: randomUUID(), ...input };
    this.plans.push(plan);
    return plan;
  }

  async findActivePlans(tenantId: string) {
    return this.plans
      .filter((plan) => plan.tenantId === tenantId)
      .map((plan) => ({ ...plan, name: plan.name ?? "Plan" }));
  }

  async create(input: CreateMembershipInput) {
    const plan = this.plans.find(
      (candidate) =>
        candidate.id === input.planId && candidate.tenantId === input.tenantId,
    );
    if (!plan) throw new NotFoundError("Membership plan", input.planId);
    if (
      this.memberships.some(
        (membership) =>
          membership.tenantId === input.tenantId &&
          membership.studentId === input.studentId &&
          ["active", "paused", "past_due"].includes(membership.status),
      )
    ) {
      throw new Error("Student already has a current membership");
    }
    const now = new Date();
    const nextBillingDate = addCycle(input.startsOn, plan.billingCycle);
    const expiresOnDate = new Date(`${nextBillingDate}T00:00:00Z`);
    expiresOnDate.setUTCDate(expiresOnDate.getUTCDate() - 1);
    const membership: StudentMembership = {
      id: randomUUID(),
      tenantId: input.tenantId,
      studentId: input.studentId,
      planId: input.planId,
      startsOn: input.startsOn,
      expiresOn: expiresOnDate.toISOString().slice(0, 10),
      nextBillingDate,
      agreedPrice: plan.price,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      expirationGraceDays: plan.expirationGraceDays,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.memberships.push(membership);
    this.events.push({
      type: "membership_activated",
      operationId: input.operationId,
    });
    return membership;
  }

  async transition(input: TransitionMembershipInput) {
    const membership = this.memberships.find(
      (candidate) =>
        candidate.id === input.membershipId &&
        candidate.tenantId === input.tenantId,
    );
    if (!membership)
      throw new NotFoundError("Student membership", input.membershipId);
    assertMembershipTransition(membership.status, input.transition);
    const effectiveAt = new Date(`${input.effectiveOn}T00:00:00Z`);
    if (input.transition === "pause") {
      membership.status = "paused";
      membership.pausedAt = effectiveAt;
    } else if (input.transition === "renew") {
      const base =
        input.effectiveOn > membership.expiresOn
          ? input.effectiveOn
          : membership.nextBillingDate;
      membership.nextBillingDate = addCycle(base, membership.billingCycle);
      const expiresOn = new Date(`${membership.nextBillingDate}T00:00:00Z`);
      expiresOn.setUTCDate(expiresOn.getUTCDate() - 1);
      membership.expiresOn = expiresOn.toISOString().slice(0, 10);
      membership.status = "active";
      membership.pausedAt = undefined;
      membership.pastDueSince = undefined;
    } else if (input.transition === "expire") {
      const graceEnd = new Date(`${membership.expiresOn}T00:00:00Z`);
      graceEnd.setUTCDate(
        graceEnd.getUTCDate() + membership.expirationGraceDays,
      );
      membership.status =
        membership.expirationGraceDays > 0 && effectiveAt <= graceEnd
          ? "past_due"
          : "expired";
      membership.pastDueSince =
        membership.status === "past_due" ? input.effectiveOn : undefined;
    } else {
      membership.status = "cancelled";
      membership.cancelledAt = effectiveAt;
    }
    membership.updatedAt = effectiveAt;
    this.events.push({
      type: `membership_${membership.status}`,
      operationId: input.operationId,
    });
    return membership;
  }

  async findByStudent(tenantId: string, studentId: string) {
    return this.memberships.filter(
      (membership) =>
        membership.tenantId === tenantId && membership.studentId === studentId,
    );
  }

  async findById(tenantId: string, membershipId: string) {
    return (
      this.memberships.find(
        (membership) =>
          membership.tenantId === tenantId && membership.id === membershipId,
      ) ?? null
    );
  }
}
