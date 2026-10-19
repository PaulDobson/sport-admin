"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import { requestSaasReceiptDelivery,retrySaasReceiptPdf,reconcileSaasReceiptDelivery } from "@/application/saas-administration/use-cases/manage-billing-payments";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";
import { getSaasDocumentConfiguration } from "@/infrastructure/composition/saas-documents-composition";
import { BusinessRuleViolationError,ValidationError } from "@/domain/shared/errors";
import { formatActionError } from "@/app/_lib/format-error";

export interface ReceiptFormState { error: string | null; message: string | null }
export async function receiptAction(_previous: ReceiptFormState,form: FormData): Promise<ReceiptFormState> {
  const { auth } = await createAuthDeps();
  if (!(await auth.getCurrentUserId())) redirect("/log-in");
  try {
    const receiptId = parseWithSchema(z.uuid(),form.get("receiptId"));
    const { billingPayments } = await createSaasAdministrationDeps();
    if (form.get("intent") === "reconcile") {
      if (form.get("accepted") !== "on") throw new BusinessRuleViolationError("Confirma la revisión con el proveedor.");
      await reconcileSaasReceiptDelivery({
        deliveryId: form.get("deliveryId"),providerId: String(form.get("providerId") ?? "").trim() || null,
        notSent: form.get("resolution") === "not_sent",reason: form.get("reason"),
      },billingPayments);
      revalidatePath(`/backoffice/receipts/${receiptId}`);
      revalidatePath("/backoffice/finance/documents");
      return { error: null,message: "Conciliación registrada. Actualiza el comprobante para revisar el estado y habilitar un nuevo envío si corresponde." };
    }
    if (form.get("intent") === "retry") {
      const result = await retrySaasReceiptPdf(receiptId,billingPayments);
      revalidatePath(`/backoffice/receipts/${receiptId}`);
      revalidatePath("/backoffice/finance/documents");
      return { error: null,message: result.status === "ready" ? "El PDF ya está disponible." : "Generación PDF encolada. El pago y el folio no se duplican." };
    }
    if (form.get("intent") !== "send") throw new BusinessRuleViolationError("Operación no válida.");
    const configuration = getSaasDocumentConfiguration();
    if (!configuration.enabled || !configuration.mailConfigured) throw new BusinessRuleViolationError("Habilita el procesador y configura Resend con un remitente verificado antes de enviar.");
    if (form.get("accepted") !== "on") throw new ValidationError([{ path: "accepted",message: "Confirma el destinatario y el envío." }]);
    await requestSaasReceiptDelivery({
      receiptId,operationId: form.get("operationId"),recipient: form.get("recipient"),source: form.get("source"),
      fallbackApproved: form.get("fallbackApproved") === "on",
    },billingPayments);
    revalidatePath(`/backoffice/receipts/${receiptId}`);
    revalidatePath("/backoffice/finance/documents");
    return { error: null,message: "Envío encolado. No se considera entregado hasta disponer de confirmación del proveedor." };
  } catch (error) { return { error: formatActionError(error),message: null }; }
}
