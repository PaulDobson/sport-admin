import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import {
  assertMembershipTransition,
  assertPlanAssignable,
  isMembershipCurrent,
  type MembershipTransition,
} from "@/domain/instructor-finance/membership";
import type { MembershipRepositoryPort } from "../ports/membership-repository-port";

const createSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  planId: z.string().uuid(),
  startsOn: z.iso.date(),
  actorMembershipId: z.string().uuid(),
  operationId: z.string().uuid(),
});

const createPlanSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(1),
  price: z.number().nonnegative(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("CLP"),
  billingCycle: z.enum(["monthly", "quarterly", "semiannual", "annual"]),
  expirationGraceDays: z.number().int().min(0).max(365),
  benefits: z.array(z.string().trim().min(1)).default([]),
});

const updatePlanSchema = createPlanSchema.extend({
  planId: z.string().uuid(),
});

const planStatusSchema = z.object({
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
  status: z.enum(["active", "archived"]),
});

const listPlansSchema = z.object({
  tenantId: z.string().uuid(),
  status: z.enum(["active", "archived"]).optional(),
});

const transitionSchema = z.object({
  tenantId: z.string().uuid(),
  membershipId: z.string().uuid(),
  effectiveOn: z.iso.date(),
  actorMembershipId: z.string().uuid(),
  operationId: z.string().uuid(),
});

const currentSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  onDate: z.iso.date(),
});

export async function activateMembership(
  input: z.input<typeof createSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  const parsed = parseWithSchema(createSchema, input);
  const plan = await deps.memberships.findPlanById(
    parsed.tenantId,
    parsed.planId,
  );
  if (plan) assertPlanAssignable(plan);
  return deps.memberships.create(parsed);
}

export function createMembershipPlan(
  input: z.input<typeof createPlanSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  return deps.memberships.createPlan(parseWithSchema(createPlanSchema, input));
}

export function updateMembershipPlan(
  input: z.input<typeof updatePlanSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  return deps.memberships.updatePlan(parseWithSchema(updatePlanSchema, input));
}

export function setMembershipPlanStatus(
  input: z.input<typeof planStatusSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  return deps.memberships.setPlanStatus(
    parseWithSchema(planStatusSchema, input),
  );
}

export function listMembershipPlans(
  input: z.input<typeof listPlansSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  const parsed = parseWithSchema(listPlansSchema, input);
  return deps.memberships.findPlans(parsed.tenantId, parsed.status);
}

async function transitionMembership(
  transition: MembershipTransition,
  input: z.input<typeof transitionSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  const parsed = parseWithSchema(transitionSchema, input);
  const membership = await deps.memberships.findById(
    parsed.tenantId,
    parsed.membershipId,
  );
  if (membership) assertMembershipTransition(membership.status, transition);
  return deps.memberships.transition({ ...parsed, transition });
}

export function pauseMembership(
  input: z.input<typeof transitionSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  return transitionMembership("pause", input, deps);
}

export function renewMembership(
  input: z.input<typeof transitionSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  return transitionMembership("renew", input, deps);
}

export function expireMembership(
  input: z.input<typeof transitionSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  return transitionMembership("expire", input, deps);
}

export function cancelMembership(
  input: z.input<typeof transitionSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  return transitionMembership("cancel", input, deps);
}

export async function listCurrentMemberships(
  input: z.input<typeof currentSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  const parsed = parseWithSchema(currentSchema, input);
  const memberships = await deps.memberships.findByStudent(
    parsed.tenantId,
    parsed.studentId,
  );
  return memberships.filter((membership) =>
    isMembershipCurrent(membership, parsed.onDate),
  );
}
