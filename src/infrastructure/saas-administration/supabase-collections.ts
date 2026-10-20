import { z } from "zod";
import type { CollectionsPort } from "@/application/saas-administration/ports/collections-port";
import { collectionStatuses, type CollectionFilters } from "@/domain/saas-administration/collections";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import { parseBillingContract, throwBillingRpcError } from "./billing-rpc-contract";

const amount = z.number().finite().nonnegative().max(9999999999.99);
const currency = z.string().regex(/^[A-Z]{3}$/);
const timestamp = z.iso.datetime({ offset: true });
const status = z.enum(collectionStatuses).exclude(["all"]);
const invoiceSchema = z.object({
  id: z.uuid(), tenant_id: z.uuid(), tenant_name: z.string().min(1), subscription_id: z.uuid(),
  invoice_number: z.string().min(1), stored_status: status, status,
  invoice_kind: z.enum(["legacy", "initial", "renewal", "upgrade"]),
  amount, currency, confirmed_amount: z.number().finite().nonnegative(), balance: amount,
  in_flight_count: z.number().int().nonnegative(), imported_settlement: z.boolean(),
  period_starts_on: z.iso.date(), period_end_exclusive: z.iso.date().nullable(),
  due_on: z.iso.date().nullable(), issued_at: timestamp.nullable(), paid_at: timestamp.nullable(),
  plan_name: z.string().nullable(),
}).refine((v) => v.period_end_exclusive === null || v.period_end_exclusive > v.period_starts_on)
  .refine((v) => v.balance <= v.amount)
  .refine((v) => !["paid", "draft", "void", "refunded"].includes(v.status) || v.balance === 0)
  .transform((v) => ({
    id: v.id, tenantId: v.tenant_id, tenantName: v.tenant_name, subscriptionId: v.subscription_id,
    invoiceNumber: v.invoice_number, storedStatus: v.stored_status, status: v.status,
    kind: v.invoice_kind, amount: v.amount, currency: v.currency, confirmedAmount: v.confirmed_amount,
    balance: v.balance, inFlightCount: v.in_flight_count, importedSettlement: v.imported_settlement,
    periodStartsOn: v.period_starts_on, periodEndExclusive: v.period_end_exclusive,
    dueOn: v.due_on, issuedAt: v.issued_at, paidAt: v.paid_at, planName: v.plan_name,
  }));
const chargeSchema = z.object({
  id: z.uuid(), amount: amount.positive(), currency,
  status: z.enum(["pending", "processing", "succeeded", "failed", "refunded"]),
  occurred_at: timestamp, provider: z.string().nullable(),
  manual_method: z.enum(["transfer", "cash", "external_card"]).nullable(), manual_reference: z.string().nullable(),
}).transform((v) => ({
  id: v.id, amount: v.amount, currency: v.currency, status: v.status,
  occurredAt: v.occurred_at, provider: v.provider, manualMethod: v.manual_method, manualReference: v.manual_reference,
}));
const refundSchema = z.object({
  id: z.uuid(), charge_id: z.uuid(), amount: amount.positive(), currency,
  status: z.enum(["pending", "processing", "succeeded", "failed", "cancelled"]),
  requested_at: timestamp, processed_at: timestamp.nullable(), reason: z.string().min(1),
}).transform((v) => ({
  id: v.id, chargeId: v.charge_id, amount: v.amount, currency: v.currency, status: v.status,
  requestedAt: v.requested_at, processedAt: v.processed_at, reason: v.reason,
}));

export class SupabaseCollections implements CollectionsPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}
  async isPlatformAdmin() {
    const { data, error } = await this.client.rpc("is_platform_admin");
    if (error) throw error;
    return data === true;
  }
  async list(filters: CollectionFilters) {
    const { data, error } = await this.client.rpc("list_saas_collections", {
      target_tenant: filters.tenantId, tenant_query: filters.query, target_status: filters.status,
      target_currency: filters.currency, due_from: filters.dueFrom, due_until: filters.dueUntil,
      page_number: filters.page, page_size: filters.pageSize,
    });
    if (error) throwBillingRpcError(error);
    const result = parseBillingContract(z.object({
      business_date: z.iso.date(), total: z.number().int().nonnegative(),
      page: z.number().int().positive(), page_size: z.number().int().positive().max(100),
      items: z.array(invoiceSchema),
    }), data);
    if (result.page !== filters.page || result.page_size !== filters.pageSize
      || result.items.length > filters.pageSize || result.items.length > result.total
      || new Set(result.items.map((i) => i.id)).size !== result.items.length
      || result.items.some((i) => (filters.tenantId !== null && i.tenantId !== filters.tenantId)
        || (filters.status !== "all" && i.status !== filters.status)
        || (filters.currency !== null && i.currency !== filters.currency)
        || (filters.dueFrom !== null && (i.dueOn === null || i.dueOn < filters.dueFrom))
        || (filters.dueUntil !== null && (i.dueOn === null || i.dueOn > filters.dueUntil)))) {
      throw new BusinessRuleViolationError("La cartera recibida no coincide con los filtros solicitados.");
    }
    return { businessDate: result.business_date, total: result.total, page: result.page, pageSize: result.page_size, items: result.items };
  }
  async get(invoiceId: string) {
    const { data, error } = await this.client.rpc("get_saas_collection", { target_invoice: invoiceId });
    if (error) throwBillingRpcError(error);
    const result = parseBillingContract(z.object({
      business_date: z.iso.date(), invoice: invoiceSchema, charges: z.array(chargeSchema).max(100),
      refunds: z.array(refundSchema).max(100), charge_count: z.number().int().nonnegative(),
      refund_count: z.number().int().nonnegative(),
    }), data);
    if (result.invoice.id !== invoiceId || result.charge_count < result.charges.length
      || result.refund_count < result.refunds.length) throw new BusinessRuleViolationError("El detalle recibido no corresponde al cobro solicitado.");
    return { businessDate: result.business_date, invoice: result.invoice, charges: result.charges,
      refunds: result.refunds, chargeCount: result.charge_count, refundCount: result.refund_count };
  }
}
