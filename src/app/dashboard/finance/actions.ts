"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  cancelMembership,
  createMembershipPlan,
  expireMembership,
  pauseMembership,
  renewMembership,
  setMembershipPlanStatus,
  updateMembershipPlan,
} from "@/application/instructor-finance/use-cases/manage-membership";
import { recordMembershipPayment } from "@/application/instructor-finance/use-cases/manage-payment";
import type { BillingCycle } from "@/domain/instructor-finance/membership";
import type { PaymentMethod } from "@/domain/instructor-finance/payment";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
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
