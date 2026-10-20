import { z } from "zod";
export const financialLedgerRequestSchema = z.object({
  period: z.iso.date().refine((s) => s.endsWith("-01"),"El período debe iniciar el primer día del mes."),
  currency: z.string().regex(/^[A-Z]{3}$/),metric: z.enum(["collected","pending","past_due","mrr"]),
  page: z.number().int().min(1).max(1000000),
});
export type FinancialLedgerRequest = z.infer<typeof financialLedgerRequestSchema>;
export const financialLedgerSchema = financialLedgerRequestSchema.extend({
  total: z.number().int().nonnegative(),amount: z.number().finite(),
  entries: z.array(z.object({
    id: z.uuid(),tenant_id: z.uuid(),tenant_name: z.string(),invoice_id: z.uuid().nullable(),
    label: z.string(),event_at: z.iso.datetime({ offset: true }).nullable(),amount: z.number().finite(),
  })).max(20),
});
export type FinancialLedger = z.infer<typeof financialLedgerSchema>;
