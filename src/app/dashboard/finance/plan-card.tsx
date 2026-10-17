import type { ReactNode } from "react";
import type { BillingCycle } from "@/domain/instructor-finance/membership";
import { monthlyEquivalent } from "@/domain/instructor-finance/dashboard";
import { formatMoney } from "@/lib/format-money";
import { ToneBadge } from "@/presentation/components/primitives";
import { billingCycleLabels, billingCycleNouns } from "./plan-templates";

export interface PlanCardData {
  name: string;
  price: number | null;
  currency: string;
  billingCycle: BillingCycle;
  expirationGraceDays: number;
  benefits: string[];
  status?: "active" | "archived";
  membershipCount?: number;
}

const visibleBenefits = 4;

export function PlanCard({
  plan,
  monthlyRevenue,
  actions,
  preview = false,
}: {
  plan: PlanCardData;
  /** Monthly equivalent of the agreed prices of current memberships. */
  monthlyRevenue?: number;
  actions?: ReactNode;
  preview?: boolean;
}) {
  const price = plan.price ?? 0;
  const hiddenBenefits = plan.benefits.length - visibleBenefits;
  const studentCount = plan.membershipCount ?? 0;

  return (
    <article
      aria-label={preview ? "Vista previa del plan" : plan.name}
      className="relative grid min-w-0 gap-4 overflow-hidden rounded-2xl border border-white/6 bg-card p-4 sm:p-5"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            {plan.name.trim() || "Nuevo plan"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {billingCycleLabels[plan.billingCycle]}
          </p>
        </div>
        {plan.status === "archived" ? (
          <ToneBadge>Archivado</ToneBadge>
        ) : (
          <ToneBadge tone="success">Activo</ToneBadge>
        )}
      </div>

      <div className="relative">
        <p className="metric-number text-2xl font-bold tracking-tight text-foreground">
          {plan.price === null ? "—" : formatMoney(price, plan.currency)}
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            / {billingCycleNouns[plan.billingCycle]}
          </span>
        </p>
        {plan.billingCycle !== "monthly" && plan.price !== null ? (
          <p className="metric-number mt-1 text-xs text-muted-foreground">
            Equivale a{" "}
            {formatMoney(
              monthlyEquivalent(price, plan.billingCycle),
              plan.currency,
            )}{" "}
            / mes
          </p>
        ) : null}
      </div>

      {preview ? null : (
        <dl className="relative grid grid-cols-2 gap-3 rounded-xl border border-white/6 bg-surface-raised/50 p-3 text-xs">
          <div className="min-w-0">
            <dt className="text-muted-foreground">Alumnos vigentes</dt>
            <dd className="metric-number mt-0.5 text-base font-semibold text-foreground">
              {studentCount} alumnos
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Ingreso mensual</dt>
            <dd className="metric-number mt-0.5 truncate text-base font-semibold text-foreground">
              {formatMoney(
                monthlyRevenue ??
                  studentCount * monthlyEquivalent(price, plan.billingCycle),
                plan.currency,
              )}
            </dd>
          </div>
        </dl>
      )}

      <p className="relative text-xs text-muted-foreground">
        gracia {plan.expirationGraceDays}{" "}
        {plan.expirationGraceDays === 1 ? "día" : "días"} antes de la mora
      </p>

      {plan.benefits.length > 0 ? (
        <ul className="relative flex flex-wrap gap-2" aria-label="Beneficios del plan">
          {plan.benefits.slice(0, visibleBenefits).map((benefit) => (
            <li
              key={benefit}
              className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground"
            >
              {benefit}
            </li>
          ))}
          {hiddenBenefits > 0 ? (
            <li className="rounded-full px-2 py-1 text-xs text-muted-foreground">
              +{hiddenBenefits} más
            </li>
          ) : null}
        </ul>
      ) : null}

      {actions ? (
        <div className="relative flex flex-wrap gap-2">{actions}</div>
      ) : null}
    </article>
  );
}
