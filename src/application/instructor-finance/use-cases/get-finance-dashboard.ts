import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { CollectionItem } from "@/domain/instructor-finance/collection";
import { summarizeCollections } from "@/domain/instructor-finance/collection";
import {
  collectionRate,
  countNewMemberships,
  currentMembershipsInPeriod,
  mergeRecentMovements,
  periodVariation,
  previousPeriod,
  summarizePlanPerformance,
  type PlanPerformance,
  type RecentMovement,
} from "@/domain/instructor-finance/dashboard";
import { calculateMonthlyFinancialProjections } from "@/domain/instructor-finance/projection";
import type { CollectionRepositoryPort } from "../ports/collection-repository-port";
import type { FinancialProjectionRepositoryPort } from "../ports/financial-projection-repository-port";
import type { PaymentRepositoryPort } from "../ports/payment-repository-port";
import { listPendingCollections } from "./list-pending-collections";

const inputSchema = z.object({
  tenantId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  onDate: z.iso.date(),
  movementLimit: z.number().int().min(1).max(50).default(8),
  actionLimit: z.number().int().min(1).max(20).default(5),
});

export interface FinanceIndicators {
  currency: string;
  collected: number;
  previousCollected: number;
  /** Percentage change against the previous period; `null` when it had no collections. */
  variation: number | null;
  pending: number;
  pendingAccounts: number;
  overdueAmount: number;
  overdueStudents: number;
  currentMemberships: number;
  newMemberships: number;
  projected: number;
  collectionRate: number;
}

export interface FinanceDashboard {
  period: string;
  previousPeriod: string;
  currencies: string[];
  indicators: FinanceIndicators[];
  movements: RecentMovement[];
  planPerformance: PlanPerformance[];
  /** Overdue or due-by-today balances, most urgent first. */
  actionItems: CollectionItem[];
}

const DEFAULT_CURRENCY = "CLP";

/** The requested currency when present, otherwise the one with the largest collectible amount. */
export function selectFinanceCurrency(
  dashboard: Pick<FinanceDashboard, "indicators">,
  requested?: string,
) {
  const requestedMatch = dashboard.indicators.find(
    (indicator) => indicator.currency === requested,
  );
  if (requestedMatch) return requestedMatch.currency;
  const [largest] = [...dashboard.indicators].sort(
    (left, right) =>
      right.projected + right.pending - (left.projected + left.pending),
  );
  return largest?.currency ?? DEFAULT_CURRENCY;
}

export async function getFinanceDashboard(
  input: z.input<typeof inputSchema>,
  deps: {
    financialProjections: FinancialProjectionRepositoryPort;
    collections: CollectionRepositoryPort;
    payments: PaymentRepositoryPort;
  },
): Promise<FinanceDashboard> {
  const parsed = parseWithSchema(inputSchema, input);
  const previous = previousPeriod(parsed.period);
  const [current, before, pending, recentPayments] = await Promise.all([
    deps.financialProjections.loadMonth(parsed.tenantId, parsed.period),
    deps.financialProjections.loadMonth(parsed.tenantId, previous),
    listPendingCollections(
      { tenantId: parsed.tenantId, onDate: parsed.onDate },
      deps,
    ),
    deps.payments.listRecentMovements(parsed.tenantId, parsed.movementLimit),
  ]);

  const projections = calculateMonthlyFinancialProjections({
    period: parsed.period,
    ...current,
  });
  const previousProjections = calculateMonthlyFinancialProjections({
    period: previous,
    ...before,
  });
  const pendingTotals = summarizeCollections(pending);
  const currentMemberships = currentMembershipsInPeriod(
    current.memberships,
    parsed.period,
  );

  const currencies = [
    ...new Set([
      ...projections.map((projection) => projection.currency),
      ...pendingTotals.map((total) => total.currency),
    ]),
  ].sort((left, right) => left.localeCompare(right));

  const indicators = currencies.map((currency) => {
    const projection = projections.find((item) => item.currency === currency);
    const previousCollected =
      previousProjections.find((item) => item.currency === currency)
        ?.collectedAmount ?? 0;
    const totals = pendingTotals.find((item) => item.currency === currency);
    const collected = projection?.collectedAmount ?? 0;
    const projected = projection?.collectibleAmount ?? 0;
    return {
      currency,
      collected,
      previousCollected,
      variation: periodVariation(collected, previousCollected),
      pending: totals?.pendingAmount ?? 0,
      pendingAccounts: totals?.accountCount ?? 0,
      overdueAmount: totals?.overdueAmount ?? 0,
      overdueStudents: new Set(
        pending
          .filter((item) => item.currency === currency && item.isOverdue)
          .map((item) => item.studentId),
      ).size,
      currentMemberships: currentMemberships.filter(
        (membership) => membership.currency === currency,
      ).length,
      newMemberships: countNewMemberships(
        current.memberships,
        parsed.period,
        currency,
      ),
      projected,
      collectionRate: collectionRate(collected, projected),
    };
  });

  return {
    period: parsed.period,
    previousPeriod: previous,
    currencies,
    indicators,
    movements: mergeRecentMovements(
      recentPayments,
      pending,
      parsed.movementLimit,
    ),
    planPerformance: summarizePlanPerformance(
      current.memberships,
      parsed.period,
    ),
    actionItems: pending
      .filter((item) => item.isOverdue || item.dueOn <= parsed.onDate)
      .slice(0, parsed.actionLimit),
  };
}
