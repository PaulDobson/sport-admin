import { z } from "zod";
import type { BillingPaymentsPort } from "@/application/saas-administration/ports/billing-payments-port";
import type { DocumentJobsPort } from "@/application/saas-administration/ports/document-jobs-port";
import {
  documentJobsPageSchema,
  type DocumentJobFilters,
} from "@/domain/saas-administration/document-jobs";
import {
  receiptDetailSchema,
  type ManualPaymentInput,
  type ReceiptDeliveryInput,
} from "@/domain/saas-administration/payment-receipt";
import {
  BusinessRuleViolationError,
  ConflictError,
} from "@/domain/shared/errors";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import {
  parseBillingContract,
  throwBillingRpcError,
} from "./billing-rpc-contract";

export function throwPaymentRpcError(error: {
  code: string;
  message: string;
}): never {
  if (["PGRST202", "42883"].includes(error.code))
    throw new BusinessRuleViolationError(
      "Aplica las migraciones SaaS 0049 y 0050 para habilitar pagos y comprobantes.",
    );
  if (error.code === "40001")
    throw new ConflictError(
      "El saldo, el destinatario o el estado cambió. Recarga y concilia antes de confirmar nuevamente.",
    );
  if (error.code === "22023" || error.code === "23514")
    throw new BusinessRuleViolationError(
      "No se puede confirmar la operación. Verifica emisor, saldo completo, fecha, referencia y estado del documento.",
    );
  throwBillingRpcError(error);
}
export class SupabaseBillingPayments
  implements BillingPaymentsPort, DocumentJobsPort
{
  constructor(private readonly client: SupabaseDatabaseClient) {}
  async isPlatformAdmin() {
    const { data, error } = await this.client.rpc("is_platform_admin");
    if (error) throw error;
    return data === true;
  }
  async listDocumentJobs(filters: DocumentJobFilters) {
    const { data, error } = await this.client.rpc("list_saas_document_jobs", {
      tenant_query: filters.query,
      target_kind: filters.kind,
      target_status: filters.status,
      page_number: filters.page,
      page_size: filters.pageSize,
    });
    if (error) {
      if (["PGRST202", "42883"].includes(error.code))
        throw new BusinessRuleViolationError(
          "La bandeja de comprobantes requiere aplicar la migración SaaS 0053 después de validarla.",
        );
      throwBillingRpcError(error);
    }
    const result = parseBillingContract(documentJobsPageSchema, data);
    if (
      result.page !== filters.page ||
      result.page_size !== filters.pageSize ||
      result.items.length > filters.pageSize
    ) {
      throw new BusinessRuleViolationError(
        "La bandeja de comprobantes no corresponde a la página solicitada.",
      );
    }
    return result;
  }
  async pay(input: ManualPaymentInput) {
    const { data, error } = await this.client.rpc(
      "record_saas_manual_payment",
      {
        target_invoice: input.invoiceId,
        expected_amount: input.amount,
        paid_on: input.paidOn,
        payment_method: input.method,
        payment_reference: input.reference ?? undefined,
        operation_id: input.operationId,
        change_reason: input.reason,
      },
    );
    if (error) throwPaymentRpcError(error);
    const r = parseBillingContract(
      z.object({
        invoice_id: z.uuid(),
        tenant_id: z.uuid(),
        charge_id: z.uuid(),
        receipt_id: z.uuid(),
        amount: z.number().int().positive(),
        status: z.literal("paid"),
      }),
      data,
    );
    if (r.invoice_id !== input.invoiceId || r.amount !== input.amount)
      throw new BusinessRuleViolationError(
        "La confirmación del pago no corresponde al cobro solicitado.",
      );
    return {
      invoiceId: r.invoice_id,
      tenantId: r.tenant_id,
      chargeId: r.charge_id,
      receiptId: r.receipt_id,
      amount: r.amount,
      status: r.status,
    };
  }
  async voidInvoice(input: {
    invoiceId: string;
    operationId: string;
    reason: string;
  }) {
    const { data, error } = await this.client.rpc("void_saas_invoice", {
      target_invoice: input.invoiceId,
      operation_id: input.operationId,
      change_reason: input.reason,
    });
    if (error) throwPaymentRpcError(error);
    const r = parseBillingContract(
      z.object({
        invoice_id: z.literal(input.invoiceId),
        status: z.literal("void"),
      }),
      data,
    );
    return void r;
  }
  async getReceipt(id: string) {
    const { data, error } = await this.client.rpc("get_saas_receipt", {
      target_receipt: id,
    });
    if (error) throwPaymentRpcError(error);
    const receipt = parseBillingContract(receiptDetailSchema, data);
    if (
      receipt.id !== id ||
      (receipt.document &&
        (receipt.document.receipt_id !== id ||
          receipt.document.storage_path !== `${id}/v1.pdf`))
    )
      throw new BusinessRuleViolationError(
        "El documento no corresponde al comprobante solicitado.",
      );
    return receipt;
  }
  async listReceipts(invoiceId: string) {
    const { data, error } = await this.client.rpc(
      "list_saas_invoice_receipts",
      { target_invoice: invoiceId },
    );
    if (error) throwPaymentRpcError(error);
    return parseBillingContract(
      z.object({
        receipts: z.array(
          z.object({
            id: z.uuid(),
            folio: z.number().int().positive(),
            total: z.number().int().positive(),
            created_at: z.iso.datetime({ offset: true }),
            ready: z.boolean(),
          }),
        ),
      }),
      data,
    ).receipts;
  }
  async requestDelivery(input: ReceiptDeliveryInput) {
    const { data, error } = await this.client.rpc(
      "request_saas_receipt_delivery",
      {
        target_receipt: input.receiptId,
        operation_id: input.operationId,
        recipient: input.recipient,
        recipient_source: input.source,
        fallback_approved: input.fallbackApproved,
      },
    );
    if (error) throwPaymentRpcError(error);
    const r = parseBillingContract(
      z.object({ delivery_id: z.uuid(), status: z.literal("queued") }),
      data,
    );
    return { deliveryId: r.delivery_id, status: r.status };
  }
  async retryPdf(id: string) {
    const { data, error } = await this.client.rpc("retry_saas_receipt_pdf", {
      target_receipt: id,
    });
    if (error) throwPaymentRpcError(error);
    return parseBillingContract(
      z.object({ status: z.enum(["queued", "ready"]) }),
      data,
    );
  }
  async reconcileDelivery(input: {
    deliveryId: string;
    providerId: string | null;
    notSent: boolean;
    reason: string;
  }) {
    const { data, error } = await this.client.rpc(
      "reconcile_saas_receipt_delivery",
      {
        target_delivery: input.deliveryId,
        confirmed_provider_id: input.providerId ?? undefined,
        confirmed_not_sent: input.notSent,
        change_reason: input.reason,
      },
    );
    if (error) throwPaymentRpcError(error);
    parseBillingContract(
      z.object({ status: z.literal(input.notSent ? "failed" : "accepted") }),
      data,
    );
  }
}
