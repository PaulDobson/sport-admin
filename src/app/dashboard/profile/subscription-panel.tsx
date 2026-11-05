"use client";

import {
  CreditCard,
  CalendarClock,
  Check,
  Zap,
  BarChart3,
  WifiOff,
  Radio,
  Bell,
  Users,
  GraduationCap,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { OwnerBilling } from "@/domain/saas-administration/owner-billing";
import type { SaasCatalogPlan } from "@/domain/saas-administration/plan-catalog";
import type { SaasFeature } from "@/domain/saas-administration/plan-entitlement";
import { StatusBadge } from "@/presentation/components/primitives";
import { formatMoney } from "@/lib/format-money";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

const featureIcon: Record<SaasFeature, React.ReactNode> = {
  reports: <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />,
  offline: <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />,
  realtime: <Radio className="h-3.5 w-3.5" aria-hidden="true" />,
  push: <Bell className="h-3.5 w-3.5" aria-hidden="true" />,
};

const featureLabel: Record<SaasFeature, string> = {
  reports: "Reportes avanzados",
  offline: "Modo sin conexión",
  realtime: "Datos en tiempo real",
  push: "Notificaciones push",
};

function subscriptionStatusTone(
  status: NonNullable<OwnerBilling["subscription"]>["status"],
) {
  if (status === "active") return "success" as const;
  if (status === "trial") return "info" as const;
  if (status === "past_due" || status === "suspended")
    return "warning" as const;
  return "destructive" as const;
}

function subscriptionStatusLabel(
  status: NonNullable<OwnerBilling["subscription"]>["status"],
) {
  const labels: Record<typeof status, string> = {
    trial: "Período de prueba",
    active: "Activo",
    past_due: "Pago pendiente",
    suspended: "Suspendido",
    cancelled: "Cancelado",
    expired: "Vencido",
  };
  return labels[status];
}

// ── Current subscription card ─────────────────────────────────────────────────

function CurrentSubscriptionCard({
  sub,
  scheduledChange,
}: {
  sub: NonNullable<OwnerBilling["subscription"]>;
  scheduledChange: OwnerBilling["scheduled_change"];
}) {
  const days = daysUntil(sub.period_end_exclusive);
  const isExpiringSoon = days <= 14 && days > 0;
  const isExpired = days <= 0;

  return (
    <div className="rounded-xl border border-white/8 bg-surface-raised/50 p-4">
      {/* Name + status */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Plan activo
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {sub.plan_name ?? "Sin nombre"}
          </p>
        </div>
        <StatusBadge tone={subscriptionStatusTone(sub.status)}>
          {subscriptionStatusLabel(sub.status)}
        </StatusBadge>
      </div>

      {/* Price */}
      <p className="metric-number mt-3 text-2xl font-bold tracking-tight text-foreground">
        {formatMoney(sub.price, sub.currency)}
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          /{" "}
          {sub.duration_unit === "months"
            ? sub.duration_count === 1
              ? "mes"
              : `${sub.duration_count} meses`
            : sub.duration_count === 1
              ? "día"
              : `${sub.duration_count} días`}
        </span>
      </p>

      {/* Expiry banner */}
      <div
        className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          isExpired
            ? "border border-destructive/30 bg-destructive/10 text-destructive"
            : isExpiringSoon
              ? "border border-warning/30 bg-warning/10 text-warning"
              : "border border-border/50 bg-muted/40 text-muted-foreground"
        }`}
      >
        {isExpired ? (
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span>
          {isExpired
            ? "Suscripción vencida"
            : isExpiringSoon
              ? `Vence en ${days} días — ${formatDate(sub.period_end_exclusive)}`
              : `Vigente hasta ${formatDate(sub.period_end_exclusive)}`}
        </span>
      </div>

      {/* Limits */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="col-span-1 flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 sm:col-span-2">
          <GraduationCap
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <p className="metric-number text-sm font-bold text-foreground">
              {sub.max_students.toLocaleString("es-CL")}
            </p>
            <p className="text-[10px] text-muted-foreground">Alumnos máx.</p>
          </div>
        </div>
        <div className="col-span-1 flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 sm:col-span-2">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="metric-number text-sm font-bold text-foreground">
              {sub.max_users.toLocaleString("es-CL")}
            </p>
            <p className="text-[10px] text-muted-foreground">Usuarios máx.</p>
          </div>
        </div>
      </div>

      {/* Features */}
      {sub.features.length > 0 && (
        <ul
          className="mt-3 flex flex-wrap gap-2"
          aria-label="Características incluidas"
        >
          {sub.features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {featureIcon[f as SaasFeature]}
              {featureLabel[f as SaasFeature]}
            </li>
          ))}
        </ul>
      )}

      {/* Scheduled change */}
      {scheduledChange && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-info/25 bg-info/10 px-3 py-2.5">
          <Clock
            className="mt-0.5 h-4 w-4 shrink-0 text-info"
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-semibold text-info">
              Cambio programado al plan{" "}
              <span className="font-bold">{scheduledChange.plan_name}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Efectivo el {formatDate(scheduledChange.effective_on)}
              {scheduledChange.status === "blocked" &&
              scheduledChange.blocked_reason
                ? ` · Bloqueado: ${scheduledChange.blocked_reason}`
                : null}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Plan pricing card ─────────────────────────────────────────────────────────

function PlanPricingCard({
  plan,
  isCurrent,
  currentPlanName,
}: {
  plan: SaasCatalogPlan;
  isCurrent: boolean;
  currentPlanName: string | null;
}) {
  const v = plan.currentVersion;
  const isUpgrade = !isCurrent && currentPlanName !== null;

  return (
    <article
      aria-label={`Plan ${v.name}`}
      className={`relative flex flex-col rounded-2xl border p-5 transition-shadow ${
        isCurrent
          ? "border-primary bg-primary/8 shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_40%,transparent),0_0_28px_6px_color-mix(in_srgb,var(--primary)_10%,transparent)]"
          : "border-white/6 bg-card hover:border-white/14 hover:shadow-lg hover:shadow-black/20"
      }`}
    >
      {/* Current plan ribbon */}
      {isCurrent && (
        <span className="absolute -top-px left-5 rounded-b-lg bg-primary px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground">
          Tu plan actual
        </span>
      )}

      {/* Header */}
      <div className="mt-2 flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-foreground">{v.name}</h3>
        {!isCurrent && (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isUpgrade ? "bg-success/15 text-success" : "bg-info/15 text-info"
            }`}
          >
            {isUpgrade ? (
              <>
                <ArrowUpCircle className="h-3 w-3" aria-hidden="true" />
                Mejorar
              </>
            ) : (
              <>
                <ArrowDownCircle className="h-3 w-3" aria-hidden="true" />
                Cambiar
              </>
            )}
          </span>
        )}
      </div>

      {v.description && (
        <p className="mt-1 text-xs text-muted-foreground">{v.description}</p>
      )}

      {/* Price */}
      <div className="mt-4 flex items-end gap-1">
        <span className="metric-number text-3xl font-black tracking-tight text-foreground">
          {formatMoney(v.price, v.currency)}
        </span>
        <span className="mb-1 text-xs text-muted-foreground">
          /{" "}
          {v.durationUnit === "months"
            ? v.durationCount === 1
              ? "mes"
              : `${v.durationCount} meses`
            : v.durationCount === 1
              ? "día"
              : `${v.durationCount} días`}
        </span>
      </div>

      {/* Limits */}
      <div className="mt-3 flex gap-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-foreground">
            {v.maxStudents.toLocaleString("es-CL")}
          </span>{" "}
          alumnos
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-foreground">
            {v.maxUsers.toLocaleString("es-CL")}
          </span>{" "}
          usuarios
        </span>
      </div>

      {/* Features */}
      <ul
        className="mt-4 flex-1 space-y-2"
        aria-label="Características incluidas"
      >
        {v.features.length > 0 ? (
          v.features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-2 text-xs text-foreground"
            >
              <Check
                className={`h-3.5 w-3.5 shrink-0 ${isCurrent ? "text-primary" : "text-success"}`}
                aria-hidden="true"
              />
              {featureLabel[f as SaasFeature]}
            </li>
          ))
        ) : (
          <li className="text-xs text-muted-foreground">
            Funcionalidades básicas incluidas.
          </li>
        )}
      </ul>

      {/* Trial note */}
      {v.trialDays > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-info">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          {v.trialDays} días de prueba gratis
        </p>
      )}

      {/* CTA footer */}
      <div className="mt-5 border-t border-white/6 pt-4">
        {isCurrent ? (
          <p className="text-center text-xs font-semibold text-primary">
            ✓ Plan en curso
          </p>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Contacta soporte para cambiar de plan
          </p>
        )}
      </div>
    </article>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SubscriptionPanel({
  subscription,
  scheduledChange,
  catalogPlans,
}: {
  subscription: OwnerBilling["subscription"];
  scheduledChange: OwnerBilling["scheduled_change"];
  catalogPlans: SaasCatalogPlan[];
}) {
  return (
    <div className="space-y-6">
      {/* Current plan */}
      <section
        aria-label="Plan activo"
        className="rounded-2xl border border-white/6 bg-card p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Mi suscripción
            </p>
            <h2 className="text-base font-semibold text-foreground">
              Plan contratado
            </h2>
          </div>
        </div>

        {subscription ? (
          <CurrentSubscriptionCard
            sub={subscription}
            scheduledChange={scheduledChange}
          />
        ) : (
          <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-8 text-center">
            <CreditCard
              className="mx-auto h-8 w-8 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-medium text-foreground">
              Sin suscripción activa
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Elige un plan para activar tu academia.
            </p>
          </div>
        )}
      </section>

      {/* Plan catalog */}
      {catalogPlans.length > 0 && (
        <section aria-label="Planes disponibles">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Planes disponibles
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalogPlans.map((plan) => (
              <PlanPricingCard
                key={plan.id}
                plan={plan}
                isCurrent={
                  subscription?.plan_name != null &&
                  plan.currentVersion.name === subscription.plan_name
                }
                currentPlanName={subscription?.plan_name ?? null}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
