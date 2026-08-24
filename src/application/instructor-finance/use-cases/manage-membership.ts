import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import {
  assertMembershipTransition,
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
  currency: z.string().regex(/^[A-Z]{3}$/),
  billingCycle: z.enum(["monthly", "quarterly", "semiannual", "annual"]),
  expirationGraceDays: z.number().int().min(0).max(365),
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

export function activateMembership(
  input: z.input<typeof createSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  return deps.memberships.create(parseWithSchema(createSchema, input));
}

export function createMembershipPlan(
  input: z.input<typeof createPlanSchema>,
  deps: { memberships: MembershipRepositoryPort },
) {
  return deps.memberships.createPlan(parseWithSchema(createPlanSchema, input));
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
