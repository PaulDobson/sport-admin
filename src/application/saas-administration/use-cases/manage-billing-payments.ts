import { z } from "zod";
import { maxClpAmount } from "@/domain/saas-administration/billing-money";
import { UnauthorizedError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { BillingPaymentsPort } from "../ports/billing-payments-port";

const operation = z.object({
  invoiceId: z.uuid(), operationId: z.uuid(),
  reason: z.string().trim().min(3,"Indica un motivo de al menos 3 caracteres.").max(500),
});
const payment = operation.extend({
  amount: z.number().int("Usa pesos enteros.").positive().max(maxClpAmount),
  paidOn: z.iso.date("Ingresa una fecha válida."),
  method: z.enum(["transfer","cash","external_card"]),
  reference: z.string().trim().max(200).nullable(),
}).refine((v) => v.method === "cash" || Boolean(v.reference), { path: ["reference"], message: "Indica la referencia de la transferencia o tarjeta externa." });
const delivery = z.object({
  receiptId: z.uuid(), operationId: z.uuid(), recipient: z.email().max(254),
  source: z.enum(["billing","primary_contact"]), fallbackApproved: z.boolean(),
}).refine((v) => v.source !== "primary_contact" || v.fallbackApproved, {
  path: ["fallbackApproved"], message: "Confirma el uso del contacto principal para este envío.",
});
async function authorize(port: BillingPaymentsPort) {
  if (!(await port.isPlatformAdmin())) throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
}
export async function recordSaasPayment(input: unknown, port: BillingPaymentsPort) {
  await authorize(port);
  return port.pay(parseWithSchema(payment,input));
}
export async function voidSaasInvoice(input: unknown, port: BillingPaymentsPort) {
  await authorize(port);
  await port.voidInvoice(parseWithSchema(operation,input));
}
export async function requestSaasReceiptDelivery(input: unknown, port: BillingPaymentsPort) {
  await authorize(port);
  return port.requestDelivery(parseWithSchema(delivery,input));
}
export async function retrySaasReceiptPdf(id: unknown, port: BillingPaymentsPort) {
  await authorize(port);
  return port.retryPdf(parseWithSchema(z.uuid(),id));
}
export async function reconcileSaasReceiptDelivery(input: unknown,port: BillingPaymentsPort) {
  await authorize(port);
  const data = parseWithSchema(z.object({
    deliveryId: z.uuid(),providerId: z.string().trim().min(1).max(200).nullable(),notSent: z.boolean(),
    reason: z.string().trim().min(3,"Documenta la conciliación con el proveedor.").max(500),
  }).refine((v) => v.notSent ? v.providerId === null : v.providerId !== null,"Confirma que no se envió o registra el ID verificado del proveedor."),input);
  await port.reconcileDelivery(data);
}
