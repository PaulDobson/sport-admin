import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import {
  assertMembershipTransition,
  assertPlanAssignable,
  isMembershipCurrent,
  type MembershipTransition,
} from "@/domain/instructor-finance/membership";
import { ConflictError, NotFoundError } from "@/domain/shared/errors";
import type { MembershipPayment } from "@/domain/instructor-finance/payment";
import type { StudentMembership } from "@/domain/instructor-finance/membership";
import type { MembershipRepositoryPort } from "../ports/membership-repository-port";
import type { PaymentRepositoryPort } from "../ports/payment-repository-port";

const createSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  planId: z.string().uuid(),
  startsOn: z.iso.date(),
  actorMembershipId: z.string().uuid(),
  operationId: z.string().uuid(),
});

const assignSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  planId: z.string().uuid(),
  startsOn: z.iso.date(),
  actorMembershipId: z.string().uuid(),
  /** Generated once per assignment flow; reused on every retry. */
  assignmentToken: z.string().uuid(),
  initialPayment: z
    .object({
      amount: z.number().positive(),
      method: z.enum(["cash", "transfer", "card", "other"]),
      paidAt: z.date(),
      reference: z.string().trim().min(1).optional(),
      /** Deterministic id derived from the assignment token. */
      operationId: z.string().uuid(),
    })
    .optional(),
});

export const CURRENT_MEMBERSHIP_CONFLICT_MESSAGE =
  "El alumno ya tiene una membresía vigente.";

export interface AssignMembershipResult {
  membership: StudentMembership;
  payment: MembershipPayment | null;
  /** Set when the membership exists but the initial payment was not recorded. */
  paymentError?: string;
}

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

async function activateOrRecover(
  parsed: z.output<typeof assignSchema>,
  memberships: MembershipRepositoryPort,
) {
  try {
    return await memberships.create({
      tenantId: parsed.tenantId,
      studentId: parsed.studentId,
      planId: parsed.planId,
      startsOn: parsed.startsOn,
      actorMembershipId: parsed.actorMembershipId,
      operationId: parsed.assignmentToken,
    });
  } catch (error) {
    if (!(error instanceof ConflictError)) throw error;
    const previous = await memberships.findByActivationOperation(
      parsed.tenantId,
      parsed.assignmentToken,
    );
    if (
      previous &&
      previous.studentId === parsed.studentId &&
      previous.planId === parsed.planId &&
      previous.startsOn === parsed.startsOn
    ) {
      return previous;
    }
    throw new ConflictError(CURRENT_MEMBERSHIP_CONFLICT_MESSAGE);
  }
}

/**
 * Activates a plan for a student and optionally records the initial payment.
 * Retrying with the same token never duplicates the membership or the payment;
 * a payment failure keeps the membership and reports `paymentError`.
 */
export async function assignMembership(
  input: z.input<typeof assignSchema>,
  deps: {
    memberships: MembershipRepositoryPort;
    payments: PaymentRepositoryPort;
  },
): Promise<AssignMembershipResult> {
  const parsed = parseWithSchema(assignSchema, input);
  const plan = await deps.memberships.findPlanById(
    parsed.tenantId,
    parsed.planId,
  );
  if (!plan) throw new NotFoundError("Membership plan", parsed.planId);
  assertPlanAssignable(plan);

  const membership = await activateOrRecover(parsed, deps.memberships);
  if (!parsed.initialPayment) return { membership, payment: null };

  try {
    const payment = await deps.payments.record({
      tenantId: parsed.tenantId,
      membershipId: membership.id,
      amount: parsed.initialPayment.amount,
      currency: membership.currency,
      method: parsed.initialPayment.method,
      paidAt: parsed.initialPayment.paidAt,
      reference: parsed.initialPayment.reference,
      actorMembershipId: parsed.actorMembershipId,
      operationId: parsed.initialPayment.operationId,
      adjustments: [],
    });
    return { membership, payment };
  } catch (error) {
    return {
      membership,
      payment: null,
      paymentError:
        error instanceof Error && error.message
          ? error.message
          : "No se pudo registrar el pago inicial.",
    };
  }
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
