import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import {
  assertMembershipTransition,
  assertPlanAssignable,
  calculatePlanDifferential,
  isMembershipCurrent,
  type MembershipTransition,
  type PlanDifferential,
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

// ─── Change membership plan with optional pro-rata differential payment ───────

const changePlanSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  currentMembershipId: z.string().uuid(),
  newPlanId: z.string().uuid(),
  /** ISO date when the change takes effect and the new plan starts. */
  changeOn: z.iso.date(),
  actorMembershipId: z.string().uuid(),
  /**
   * Stable token for the whole change flow (idempotency).
   * The cancel operation uses `cancelOperationId` and the assign step reuses
   * `changeToken` as its assignmentToken.
   */
  changeToken: z.string().uuid(),
  /** Separate idempotency key for the cancel sub-operation derived by the caller. */
  cancelOperationId: z.string().uuid(),
  /** When provided, the differential payment is recorded against the new membership. */
  differentialPayment: z
    .object({
      amount: z.number().positive(),
      method: z.enum(["cash", "transfer", "card", "other"]),
      paidAt: z.date(),
      reference: z.string().trim().min(1).optional(),
      operationId: z.string().uuid(),
    })
    .optional(),
});

export interface ChangeMembershipPlanResult {
  membership: StudentMembership;
  payment: MembershipPayment | null;
  differential: PlanDifferential | null;
  paymentError?: string;
}

/**
 * Atomically cancels the student's current membership and assigns a new plan.
 * When `differentialPayment` is provided the pro-rata amount owed is recorded
 * as a payment against the freshly created membership.
 *
 * The use-case is fully idempotent: retrying with the same `changeToken`
 * will recover the existing membership without creating duplicates.
 */
export async function changeMembershipPlan(
  input: z.input<typeof changePlanSchema>,
  deps: {
    memberships: MembershipRepositoryPort;
    payments: PaymentRepositoryPort;
  },
): Promise<ChangeMembershipPlanResult> {
  const parsed = parseWithSchema(changePlanSchema, input);

  // Validate the new plan exists and is assignable
  const newPlan = await deps.memberships.findPlanById(
    parsed.tenantId,
    parsed.newPlanId,
  );
  if (!newPlan) throw new NotFoundError("Membership plan", parsed.newPlanId);
  assertPlanAssignable(newPlan);

  // Load current membership to compute the differential
  const current = await deps.memberships.findById(
    parsed.tenantId,
    parsed.currentMembershipId,
  );

  const differential = current
    ? calculatePlanDifferential(
        current.agreedPrice,
        current.billingCycle,
        current.startsOn,
        parsed.changeOn,
        newPlan.price,
      )
    : null;

  // 1. Cancel the existing membership (idempotent: RPC ignores if already cancelled)
  try {
    await deps.memberships.transition({
      tenantId: parsed.tenantId,
      membershipId: parsed.currentMembershipId,
      transition: "cancel",
      effectiveOn: parsed.changeOn,
      actorMembershipId: parsed.actorMembershipId,
      operationId: parsed.cancelOperationId,
    });
  } catch (error) {
    // Swallow if already cancelled (idempotency) — any other error re-throws
    const msg = error instanceof Error ? error.message : String(error);
    const alreadyCancelled = msg.includes("already cancelled");
    if (!alreadyCancelled) throw error;
  }

  // 2. Assign the new plan
  const membership = await activateOrRecover(
    {
      tenantId: parsed.tenantId,
      studentId: parsed.studentId,
      planId: parsed.newPlanId,
      startsOn: parsed.changeOn,
      actorMembershipId: parsed.actorMembershipId,
      assignmentToken: parsed.changeToken,
    },
    deps.memberships,
  );

  // 3. Optionally record the differential payment
  if (!parsed.differentialPayment) {
    return { membership, payment: null, differential };
  }

  try {
    const payment = await deps.payments.record({
      tenantId: parsed.tenantId,
      membershipId: membership.id,
      amount: parsed.differentialPayment.amount,
      currency: membership.currency,
      method: parsed.differentialPayment.method,
      paidAt: parsed.differentialPayment.paidAt,
      reference: parsed.differentialPayment.reference,
      actorMembershipId: parsed.actorMembershipId,
      operationId: parsed.differentialPayment.operationId,
      adjustments: [],
    });
    return { membership, payment, differential };
  } catch (error) {
    return {
      membership,
      payment: null,
      differential,
      paymentError:
        error instanceof Error && error.message
          ? error.message
          : "No se pudo registrar el pago diferencial.",
    };
  }
}

/**
 * Pure calculation — no I/O. Returns the pro-rata differential for the UI
 * preview before the instructor confirms the change.
 */
export function previewPlanDifferential(input: {
  currentAgreedPrice: number;
  currentBillingCycle: Parameters<typeof calculatePlanDifferential>[1];
  startsOn: string;
  changeOn: string;
  newPlanPrice: number;
}): PlanDifferential {
  return calculatePlanDifferential(
    input.currentAgreedPrice,
    input.currentBillingCycle,
    input.startsOn,
    input.changeOn,
    input.newPlanPrice,
  );
}
