import { z } from "zod";
export const ownerBillingSchema = z.object({
  tenant_id: z.uuid(),tenant_name: z.string().min(1),tenant_status: z.enum(["pending","trial","active","suspended","cancelled"]),
  owner_tenants: z.array(z.object({ id: z.uuid(),name: z.string().min(1) })),
  balances: z.array(z.object({ currency: z.string().regex(/^[A-Z]{3}$/),amount: z.number().positive() })),
  subscription: z.object({
    id: z.uuid(),status: z.enum(["trial","active","past_due","suspended","cancelled","expired"]),
    payment_status: z.enum(["pending","paid","failed","partial","not_due"]),plan_name: z.string().nullable(),
    price: z.number().nonnegative(),currency: z.string().regex(/^[A-Z]{3}$/),
    period_starts_on: z.iso.date(),period_end_exclusive: z.iso.date(),duration_unit: z.enum(["days","months"]),duration_count: z.number().int().positive(),
    services: z.array(z.string()),features: z.array(z.string()),max_students: z.number().int().positive(),max_users: z.number().int().positive(),
  }).nullable(),
  scheduled_change: z.object({ effective_on: z.iso.date(),status: z.enum(["scheduled","blocked"]),
    plan_name: z.string(),price: z.number().nonnegative(),currency: z.string(),blocked_reason: z.string().nullable() }).nullable(),
  page: z.number().int().positive(),total: z.number().int().nonnegative(),
  invoices: z.array(z.object({
    id: z.uuid(),invoice_number: z.string(),amount: z.number().nonnegative(),currency: z.string(),
    balance: z.number().nonnegative(),status: z.enum(["draft","open","paid","past_due","void","refunded"]),
    due_on: z.iso.date().nullable(),imported_settlement: z.boolean(),
    receipts: z.array(z.object({ id: z.uuid(),folio: z.number().int().positive(),total: z.number().nonnegative(),ready: z.boolean() })),
    payments: z.array(z.object({ amount: z.number().positive(),currency: z.string(),occurred_at: z.iso.datetime({ offset: true }),status: z.enum(["succeeded","refunded"]) })),
  })).max(20),
});
export type OwnerBilling = z.infer<typeof ownerBillingSchema>;
