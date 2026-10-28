"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  assignMembership,
  cancelMembership,
  changeMembershipPlan,
  createMembershipPlan,
  expireMembership,
  listMembershipPlans,
  pauseMembership,
  previewPlanDifferential,
  renewMembership,
  setMembershipPlanStatus,
  updateMembershipPlan,
} from "@/application/instructor-finance/use-cases/manage-membership";
import {
  getMembershipBalance,
  recordMembershipPayment,
} from "@/application/instructor-finance/use-cases/manage-payment";
import { listStudentsForAdministration } from "@/application/instructor-operations/use-cases/list-students-for-administration";
import type { BillingCycle } from "@/domain/instructor-finance/membership";
import type { PlanDifferential } from "@/domain/instructor-finance/membership";
import {
  BusinessRuleViolationError,
  ConflictError,
} from "@/domain/shared/errors";
import type { PaymentMethod } from "@/domain/instructor-finance/payment";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { createInstructorOperationsDeps } from "@/infrastructure/composition/instructor-operations-composition";
import { formatActionError } from "@/app/_lib/format-error";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { collectionOperationId } from "./operation-id";

export interface PlanFormState {
  error: string | null;
  saved: boolean;
}

export interface CollectionFormState {
  error: string | null;
  saved: boolean;
}

const billingCycles: BillingCycle[] = [
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
];
const supportedMethods: PaymentMethod[] = ["cash", "transfer", "card", "other"];

function readBillingCycle(formData: FormData): BillingCycle {
  const value = String(formData.get("billingCycle") ?? "monthly");
  return billingCycles.find((cycle) => cycle === value) ?? "monthly";
}

function readPaymentMethod(formData: FormData): PaymentMethod {
  const value = String(formData.get("method") ?? "other");
  return supportedMethods.find((method) => method === value) ?? "other";
}

function readBenefits(formData: FormData) {
  return String(formData.get("benefits") ?? "")
    .split("\n")
    .map((benefit) => benefit.trim())
    .filter(Boolean);
}

function revalidateFinance() {
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/collections");
  revalidatePath("/dashboard/finance/plans");
  revalidatePath("/dashboard/students");
}

export async function createPlanAction(
  _previousState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const actor = await requireOperationalMembership();
  try {
    await createMembershipPlan(
      {
        tenantId: actor.tenantId,
        name: String(formData.get("name") ?? ""),
        price: Number(formData.get("price")),
        currency: String(formData.get("currency") ?? "CLP").toUpperCase(),
        billingCycle: readBillingCycle(formData),
        expirationGraceDays: Number(formData.get("expirationGraceDays")),
        benefits: readBenefits(formData),
      },
      await createInstructorFinanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidateFinance();
  return { error: null, saved: true };
}

export async function updatePlanAction(
  _previousState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const actor = await requireOperationalMembership();
  const planId = String(formData.get("planId") ?? "");
  try {
    const finance = await createInstructorFinanceDeps();
    await updateMembershipPlan(
      {
        tenantId: actor.tenantId,
        planId,
        name: String(formData.get("name") ?? ""),
        price: Number(formData.get("price")),
        currency: String(formData.get("currency") ?? "CLP").toUpperCase(),
        billingCycle: readBillingCycle(formData),
        expirationGraceDays: Number(formData.get("expirationGraceDays")),
        benefits: readBenefits(formData),
      },
      finance,
    );
    await finance.auditLog.record({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action: "membership_plan.updated",
      entityType: "membership_plan",
      entityId: planId,
      occurredAt: new Date(),
    });
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidateFinance();
  return { error: null, saved: true };
}

export async function setPlanStatusAction(
  _previousState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const actor = await requireOperationalMembership();
  const planId = String(formData.get("planId") ?? "");
  const status = formData.get("status") === "archived" ? "archived" : "active";
  try {
    const finance = await createInstructorFinanceDeps();
    await setMembershipPlanStatus(
      { tenantId: actor.tenantId, planId, status },
      finance,
    );
    await finance.auditLog.record({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action:
        status === "archived"
          ? "membership_plan.archived"
          : "membership_plan.reactivated",
      entityType: "membership_plan",
      entityId: planId,
      occurredAt: new Date(),
    });
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidateFinance();
  return { error: null, saved: true };
}

export async function recordPaymentAction(
  _previousState: CollectionFormState,
  formData: FormData,
): Promise<CollectionFormState> {
  const actor = await requireOperationalMembership();
  const adjustmentAmount = Number(formData.get("adjustmentAmount") ?? 0);
  const adjustmentReason = String(
    formData.get("adjustmentReason") ?? "",
  ).trim();
  const adjustmentKind = String(formData.get("adjustmentKind") ?? "discount");
  const reference = String(formData.get("reference") ?? "").trim();
  const paidOn = String(formData.get("paidOn") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");
  const amount = Number(formData.get("amount"));
  const method = readPaymentMethod(formData);
  try {
    await recordMembershipPayment(
      {
        tenantId: actor.tenantId,
        membershipId,
        amount,
        currency: String(formData.get("currency") ?? "CLP").toUpperCase(),
        method,
        paidAt: paidOn ? new Date(`${paidOn}T12:00:00Z`) : new Date(),
        reference: reference || undefined,
        actorMembershipId: actor.id,
        operationId: collectionOperationId([
          actor.tenantId,
          membershipId,
          String(amount),
          method,
          paidOn,
          reference,
          adjustmentKind,
          String(adjustmentAmount),
          adjustmentReason,
        ]),
        adjustments:
          adjustmentAmount > 0 && adjustmentReason
            ? [
                {
                  kind: adjustmentKind as "discount" | "credit" | "tax",
                  amount: adjustmentAmount,
                  reason: adjustmentReason,
                },
              ]
            : [],
      },
      await createInstructorFinanceDeps(),
    );
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidateFinance();
  return { error: null, saved: true };
}

export async function transitionMembershipAction(
  _previousState: CollectionFormState,
  formData: FormData,
): Promise<CollectionFormState> {
  const actor = await requireOperationalMembership();
  const transition = String(formData.get("transition") ?? "");
  const input = {
    tenantId: actor.tenantId,
    membershipId: String(formData.get("membershipId") ?? ""),
    effectiveOn:
      String(formData.get("effectiveOn") ?? "") ||
      new Date().toISOString().slice(0, 10),
    actorMembershipId: actor.id,
    operationId: randomUUID(),
  };
  const finance = await createInstructorFinanceDeps();
  try {
    if (transition === "pause") await pauseMembership(input, finance);
    else if (transition === "renew") await renewMembership(input, finance);
    else if (transition === "expire") await expireMembership(input, finance);
    else if (transition === "cancel") await cancelMembership(input, finance);
    else return { error: "Transición no soportada.", saved: false };
  } catch (error) {
    return { error: formatActionError(error), saved: false };
  }
  revalidateFinance();
  return { error: null, saved: true };
}

export interface AssignableStudent {
  id: string;
  fullName: string;
  photoUrl: string | null;
  hasCurrentMembership: boolean;
}

export interface AssignablePlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  expirationGraceDays: number;
  benefits: string[];
}

export interface AssignMembershipState {
  status: "idle" | "error" | "assigned" | "payment_failed";
  error: string | null;
  result?: {
    membershipId: string;
    studentId: string;
    expiresOn: string;
    agreedPrice: number;
    currency: string;
    paidAmount: number;
    balance: number;
  };
}

const assignmentForbidden =
  "Tu rol no permite asignar planes. Pide ayuda al instructor a cargo.";

function assignmentErrorMessage(error: unknown) {
  if (error instanceof ConflictError) {
    return "El alumno ya tiene una membresía vigente. Revisa su ficha para renovarla o cambiarla.";
  }
  if (error instanceof BusinessRuleViolationError) {
    return "El plan está archivado. Elige un plan activo.";
  }
  return formatActionError(error);
}

/** Active students matching the query, flagging those that already hold a current membership. */
export async function searchAssignableStudentsAction(
  query: string,
): Promise<AssignableStudent[]> {
  const actor = await requireOperationalMembership();
  if (actor.role === "assistant") return [];
  const [operations, finance] = await Promise.all([
    createInstructorOperationsDeps(),
    createInstructorFinanceDeps(),
  ]);
  const { rows } = await listStudentsForAdministration(
    {
      tenantId: actor.tenantId,
      page: 1,
      pageSize: 8,
      search: query.slice(0, 80),
      status: "active",
    },
    operations,
  );
  const withMembership = new Set(
    await finance.memberships.findStudentIdsWithCurrentMembership(
      actor.tenantId,
      rows.map((row) => row.id),
    ),
  );
  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    photoUrl: row.photoUrl,
    hasCurrentMembership: withMembership.has(row.id),
  }));
}

export async function listAssignablePlansAction(): Promise<AssignablePlan[]> {
  const actor = await requireOperationalMembership();
  if (actor.role === "assistant") return [];
  const plans = await listMembershipPlans(
    { tenantId: actor.tenantId, status: "active" },
    await createInstructorFinanceDeps(),
  );
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    billingCycle: plan.billingCycle,
    expirationGraceDays: plan.expirationGraceDays,
    benefits: plan.benefits,
  }));
}

export async function assignMembershipAction(
  _previousState: AssignMembershipState,
  formData: FormData,
): Promise<AssignMembershipState> {
  const actor = await requireOperationalMembership();
  if (actor.role === "assistant") {
    return { status: "error", error: assignmentForbidden };
  }
  const studentId = String(formData.get("studentId") ?? "");
  const assignmentToken = String(formData.get("assignmentToken") ?? "");
  const withPayment = formData.get("withPayment") === "on";
  const paidOn = String(formData.get("paidOn") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  const finance = await createInstructorFinanceDeps();

  let result: Awaited<ReturnType<typeof assignMembership>>;
  try {
    result = await assignMembership(
      {
        tenantId: actor.tenantId,
        studentId,
        planId: String(formData.get("planId") ?? ""),
        startsOn: String(formData.get("startsOn") ?? ""),
        actorMembershipId: actor.id,
        assignmentToken,
        initialPayment: withPayment
          ? {
              amount: Number(formData.get("amount")),
              method: readPaymentMethod(formData),
              paidAt: paidOn ? new Date(`${paidOn}T12:00:00Z`) : new Date(),
              reference: reference || undefined,
              operationId: collectionOperationId([
                actor.tenantId,
                assignmentToken,
                "initial-payment",
              ]),
            }
          : undefined,
      },
      finance,
    );
  } catch (error) {
    return { status: "error", error: assignmentErrorMessage(error) };
  }

  revalidateFinance();
  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard");

  const balance = await getMembershipBalance(
    { tenantId: actor.tenantId, membershipId: result.membership.id },
    finance,
  ).catch(() => null);
  const summary = {
    membershipId: result.membership.id,
    studentId: result.membership.studentId,
    expiresOn: result.membership.expiresOn,
    agreedPrice: result.membership.agreedPrice,
    currency: result.membership.currency,
    paidAmount: balance?.paidAmount ?? result.payment?.amount ?? 0,
    balance:
      balance?.balance ??
      result.membership.agreedPrice - (result.payment?.amount ?? 0),
  };
  if (result.paymentError) {
    console.error("Initial membership payment failed", result.paymentError);
    return {
      status: "payment_failed",
      error:
        "La membresía quedó creada, pero el pago inicial no se registró. El saldo quedó pendiente en cobros.",
      result: summary,
    };
  }
  return { status: "assigned", error: null, result: summary };
}

export interface ChangeMembershipPlanState {
  status: "idle" | "error" | "changed" | "payment_failed";
  error: string | null;
  result?: {
    membershipId: string;
    studentId: string;
    expiresOn: string;
    agreedPrice: number;
    currency: string;
    differential: PlanDifferential | null;
    paidAmount: number;
  };
}

/**
 * Cancels the student's current membership and assigns a new plan.
 * When `withDifferentialPayment` is "on" the instructor has agreed to collect
 * the differential immediately; the amount, method and paid-on date must be
 * included in the form data.
 */
export async function changeMembershipPlanAction(
  _previousState: ChangeMembershipPlanState,
  formData: FormData,
): Promise<ChangeMembershipPlanState> {
  const actor = await requireOperationalMembership();
  if (actor.role === "assistant") {
    return {
      status: "error",
      error:
        "Tu rol no permite cambiar planes. Pide ayuda al instructor a cargo.",
    };
  }

  const currentMembershipId = String(formData.get("currentMembershipId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const newPlanId = String(formData.get("newPlanId") ?? "");
  const changeOn =
    String(formData.get("changeOn") ?? "") ||
    new Date().toISOString().slice(0, 10);
  const changeToken = String(formData.get("changeToken") ?? "");
  const cancelOperationId = String(formData.get("cancelOperationId") ?? "");
  const withPayment = formData.get("withDifferentialPayment") === "on";
  const paidOn = String(formData.get("paidOn") ?? "");

  const finance = await createInstructorFinanceDeps();

  let result: Awaited<ReturnType<typeof changeMembershipPlan>>;
  try {
    result = await changeMembershipPlan(
      {
        tenantId: actor.tenantId,
        studentId,
        currentMembershipId,
        newPlanId,
        changeOn,
        actorMembershipId: actor.id,
        changeToken,
        cancelOperationId,
        differentialPayment: withPayment
          ? {
              amount: Number(formData.get("differentialAmount")),
              method: readPaymentMethod(formData),
              paidAt: paidOn ? new Date(`${paidOn}T12:00:00Z`) : new Date(),
              reference:
                String(formData.get("reference") ?? "").trim() || undefined,
              operationId: collectionOperationId([
                actor.tenantId,
                changeToken,
                "differential-payment",
              ]),
            }
          : undefined,
      },
      finance,
    );
  } catch (error) {
    return { status: "error", error: formatActionError(error) };
  }

  revalidateFinance();
  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard");

  const summary = {
    membershipId: result.membership.id,
    studentId: result.membership.studentId,
    expiresOn: result.membership.expiresOn,
    agreedPrice: result.membership.agreedPrice,
    currency: result.membership.currency,
    differential: result.differential,
    paidAmount: result.payment?.amount ?? 0,
  };

  if (result.paymentError) {
    console.error(
      "Differential payment failed on plan change",
      result.paymentError,
    );
    return {
      status: "payment_failed",
      error:
        "El plan cambió correctamente, pero el pago diferencial no se registró. El saldo quedó pendiente.",
      result: summary,
    };
  }

  return { status: "changed", error: null, result: summary };
}

// ─── Preview differential (server action callable from the UI) ────────────────

export interface DifferentialPreview {
  differential: PlanDifferential;
  currency: string;
}

/**
 * Returns the pro-rata differential for the UI preview step.
 * Called after the instructor selects the new plan but before confirming.
 */
export async function previewPlanDifferentialAction(input: {
  currentMembershipId: string;
  newPlanId: string;
  changeOn: string;
}): Promise<
  { ok: true; data: DifferentialPreview } | { ok: false; error: string }
> {
  const actor = await requireOperationalMembership();
  if (actor.role === "assistant") {
    return { ok: false, error: "Sin permiso para calcular diferenciales." };
  }
  try {
    const finance = await createInstructorFinanceDeps();
    const [current, newPlan] = await Promise.all([
      finance.memberships.findById(actor.tenantId, input.currentMembershipId),
      finance.memberships.findPlanById(actor.tenantId, input.newPlanId),
    ]);
    if (!current)
      return { ok: false, error: "Membresía actual no encontrada." };
    if (!newPlan) return { ok: false, error: "Plan destino no encontrado." };

    const differential = previewPlanDifferential({
      currentAgreedPrice: current.agreedPrice,
      currentBillingCycle: current.billingCycle,
      startsOn: current.startsOn,
      changeOn: input.changeOn,
      newPlanPrice: newPlan.price,
    });

    return { ok: true, data: { differential, currency: current.currency } };
  } catch (error) {
    return { ok: false, error: formatActionError(error) };
  }
}
