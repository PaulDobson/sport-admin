import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import { summarizeCollections } from "@/domain/instructor-finance/collection";
import type { MembershipPayment } from "@/domain/instructor-finance/payment";
import type { CollectionRepositoryPort } from "../ports/collection-repository-port";
import type { PaymentRepositoryPort } from "../ports/payment-repository-port";
import { listPendingCollections } from "./list-pending-collections";

const periodSchema = z.object({
  tenantId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  onDate: z.iso.date(),
  method: z.enum(["cash", "transfer", "card", "other"]).optional(),
});

export interface CollectionPeriodCurrencyReport {
  currency: string;
  collectedAmount: number;
  pendingAmount: number;
  paymentCount: number;
}

function totalCollectedByCurrency(payments: MembershipPayment[]) {
  const totals = new Map<string, { amount: number; count: number }>();
  for (const payment of payments) {
    const current = totals.get(payment.currency) ?? { amount: 0, count: 0 };
    current.amount += payment.amount;
    current.count += 1;
    totals.set(payment.currency, current);
  }
  return totals;
}

/** Collected and outstanding amounts never merge across currencies. */
export async function getCollectionPeriodReport(
  input: z.input<typeof periodSchema>,
  deps: {
    payments: PaymentRepositoryPort;
    collections: CollectionRepositoryPort;
  },
): Promise<{
  payments: MembershipPayment[];
  byCurrency: CollectionPeriodCurrencyReport[];
}> {
  const parsed = parseWithSchema(periodSchema, input);
  const [payments, pending] = await Promise.all([
    deps.payments.listPaymentsByPeriod(
      parsed.tenantId,
      parsed.period,
      parsed.method,
    ),
    listPendingCollections(
      { tenantId: parsed.tenantId, onDate: parsed.onDate },
      deps,
    ),
  ]);

  const collected = totalCollectedByCurrency(payments);
  const outstanding = summarizeCollections(pending);
  const currencies = new Set([
    ...collected.keys(),
    ...outstanding.map((total) => total.currency),
  ]);

  const byCurrency = [...currencies]
    .sort((left, right) => left.localeCompare(right))
    .map((currency) => ({
      currency,
      collectedAmount: collected.get(currency)?.amount ?? 0,
      pendingAmount:
        outstanding.find((total) => total.currency === currency)
          ?.pendingAmount ?? 0,
      paymentCount: collected.get(currency)?.count ?? 0,
    }));

  return { payments, byCurrency };
}
