"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { recordSaasPayment,voidSaasInvoice } from "@/application/saas-administration/use-cases/manage-billing-payments";
import type { ManualPaymentResult } from "@/domain/saas-administration/payment-receipt";
import { ValidationError } from "@/domain/shared/errors";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { formatActionError } from "@/app/_lib/format-error";

export interface PaymentFormState {
  error: string | null; fieldErrors: Record<string,string>; result: ManualPaymentResult | null; voided: boolean;
}
export async function paymentAction(_previous: PaymentFormState,form: FormData): Promise<PaymentFormState> {
  const { auth } = await createAuthDeps();
  if (!(await auth.getCurrentUserId())) redirect("/log-in");
  try {
    if (form.get("accepted") !== "on") throw new ValidationError([{ path: "accepted",message: "Confirma que revisaste el cobro y la operación." }]);
    const { billingPayments } = await createSaasAdministrationDeps();
    const common = { invoiceId: form.get("invoiceId"),operationId: form.get("operationId"),reason: form.get("reason") };
    if (form.get("intent") === "void") {
      await voidSaasInvoice(common,billingPayments);
      revalidatePath("/backoffice","layout");
      revalidatePath("/billing");
      return { error: null,fieldErrors: {},result: null,voided: true };
    }
    if (form.get("intent") !== "pay") throw new ValidationError([{ path: "intent",message: "Operación no válida." }]);
    const amount = form.get("amount");
    const result = await recordSaasPayment({ ...common,amount: typeof amount === "string" && amount.trim() ? Number(amount) : NaN,
      paidOn: form.get("paidOn"),method: form.get("method"),reference: String(form.get("reference") ?? "").trim() || null },billingPayments);
    revalidatePath("/backoffice","layout");
    revalidatePath("/billing");
    return { error: null,fieldErrors: {},result,voided: false };
  } catch (error) {
    return { error: formatActionError(error),fieldErrors: error instanceof ValidationError ? Object.fromEntries(error.issues.map((i) => [i.path,i.message])) : {},result: null,voided: false };
  }
}
