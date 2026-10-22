import Link from "next/link";
import {
  CircleDollarSign,
  CreditCard,
  FileBarChart2,
  ReceiptText,
} from "lucide-react";
import {
  getFinanceDashboard,
  selectFinanceCurrency,
} from "@/application/instructor-finance/use-cases/get-finance-dashboard";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { financeHref } from "./finance-href";
import { LinkTabs } from "./link-tabs";
import { FinanceSummary } from "./summary/finance-summary";

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

interface FinancePageProps {
  searchParams: Promise<{
    period?: string;
    currency?: string;
  }>;
}

/**
 * Finance dashboard — the main entry point for the finance module.
 *
 * This page shows the financial overview (indicators, recent movements,
 * plan performance) for a given period. Navigation to sub-sections is done
 * via the sidebar submenu (desktop) or the "Más" sheet (mobile):
 *   - /dashboard/finance/collections — pending payments list
 *   - /dashboard/finance/plans      — membership plan catalog
 */
export default async function FinancePage({ searchParams }: FinancePageProps) {
  const membership = await requireOperationalMembership();
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const currentPeriod = today.slice(0, 7);
  const period =
    params.period && PERIOD_PATTERN.test(params.period)
      ? params.period
      : currentPeriod;
  const canManage = membership.role !== "assistant";

  const finance = await createInstructorFinanceDeps();
  const dashboard = await getFinanceDashboard(
    { tenantId: membership.tenantId, period, onDate: today },
    finance,
  );
  const currency = selectFinanceCurrency(dashboard, params.currency);

  const linkParams = {
    period: params.period,
    currency: params.currency,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Resumen financiero
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Indicadores del período, movimientos recientes y rendimiento por
            plan.
          </p>
        </div>
        {canManage ? (
          <Link
            href={financeHref(linkParams, { assign: "1" })}
            scroll={false}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CreditCard className="size-4" aria-hidden />
            Asignar plan
          </Link>
        ) : null}
      </div>

      {/* Quick-access cards to sub-sections */}
      <nav
        aria-label="Secciones de finanzas"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <Link
          href="/dashboard/finance"
          aria-current="page"
          className="flex items-center gap-3 rounded-xl border border-primary/25 bg-navigation-active px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/12">
            <FileBarChart2 className="h-4 w-4" aria-hidden />
          </span>
          <span>
            <span className="block font-semibold">Resumen</span>
            <span className="block text-xs font-normal text-primary/70">
              Indicadores del período
            </span>
          </span>
        </Link>

        <Link
          href="/dashboard/finance/collections"
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-raised text-muted-foreground">
            <ReceiptText className="h-4 w-4" aria-hidden />
          </span>
          <span>
            <span className="block font-semibold">Cobros</span>
            <span className="block text-xs font-normal text-muted-foreground">
              Membresías con saldo pendiente
            </span>
          </span>
        </Link>

        <Link
          href="/dashboard/finance/plans"
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-raised text-muted-foreground">
            <CircleDollarSign className="h-4 w-4" aria-hidden />
          </span>
          <span>
            <span className="block font-semibold">Mantención de planes</span>
            <span className="block text-xs font-normal text-muted-foreground">
              Catálogo de planes y precios
            </span>
          </span>
        </Link>
      </nav>

      {/* Financial dashboard */}
      <FinanceSummary
        dashboard={dashboard}
        currency={currency}
        today={today}
        canManage={canManage}
        linkParams={linkParams}
      />
    </div>
  );
}
