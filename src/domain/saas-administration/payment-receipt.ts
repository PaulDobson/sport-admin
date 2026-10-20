import { z } from "zod";
import { maxClpAmount, includedVat } from "./billing-money";

const money = z.number().int().min(0).max(maxClpAmount);
export const receiptSnapshotSchema = z.object({
  template_version: z.literal(1),
  issuer: z.object({ legal_name: z.string().min(1), tax_id: z.string().min(1), address: z.string().min(1), email: z.email() }),
  tenant: z.object({ name: z.string().min(1), tax_id: z.string().nullable(), billing_contact_name: z.string().nullable(),
    billing_contact_email: z.string().nullable(), address: z.string().nullable() }),
  invoice_number: z.string().min(1), concept: z.enum(["legacy","initial","renewal","upgrade"]),
  plan_name: z.string(), services: z.array(z.string().max(500)).max(50),
  period_starts_on: z.iso.date(), period_end_exclusive: z.iso.date().nullable(),
  paid_on: z.iso.date(), method: z.enum(["transfer","cash","external_card","external_provider"]), reference: z.string().nullable(),
  total: money.positive(), net: money, vat: money, currency: z.literal("CLP"), vat_rate: z.literal(19),
}).refine((v) => v.net + v.vat === v.total && includedVat(v.total).net === v.net, "El IVA del comprobante es inconsistente.");
export type ReceiptSnapshot = z.infer<typeof receiptSnapshotSchema>;
export const receiptCoreSchema = z.object({
  id: z.uuid(), tenant_id: z.uuid(), folio: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  snapshot: receiptSnapshotSchema, created_at: z.iso.datetime({ offset: true }),
});
export const receiptDocumentSchema = z.object({
  receipt_id: z.uuid(), storage_path: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  byte_size: z.number().int().positive().max(10485760), content_type: z.literal("application/pdf"),
});
export const receiptDetailSchema = receiptCoreSchema.extend({
  invoice_id: z.uuid(), document: receiptDocumentSchema.nullable(),
  pdf_job: z.object({ status: z.enum(["queued","running","succeeded","failed","unknown"]),
    attempts: z.number().int().nonnegative(), last_error: z.string().nullable() }),
  deliveries: z.array(z.object({
    id: z.uuid(), recipient: z.email(), status: z.enum(["queued","sending","accepted","delivered","failed","unknown"]),
    requested_at: z.iso.datetime({ offset: true }), last_error: z.string().nullable(),
  })),
  billing_email: z.string().nullable(), primary_email: z.string().nullable(),
});
export type ReceiptCore = z.infer<typeof receiptCoreSchema>;
export type ReceiptDetail = z.infer<typeof receiptDetailSchema>;
export type ReceiptDocument = z.infer<typeof receiptDocumentSchema>;
export interface ManualPaymentInput {
  invoiceId: string; amount: number; paidOn: string; method: "transfer" | "cash" | "external_card";
  reference: string | null; operationId: string; reason: string;
}
export interface ManualPaymentResult {
  invoiceId: string; tenantId: string; chargeId: string; receiptId: string; amount: number; status: "paid";
}
export interface ReceiptDeliveryInput {
  receiptId: string; operationId: string; recipient: string; source: "billing" | "primary_contact"; fallbackApproved: boolean;
}
export interface ReceiptSummary { id: string; folio: number; total: number; created_at: string; ready: boolean }
