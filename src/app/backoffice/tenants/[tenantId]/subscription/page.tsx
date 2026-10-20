import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getSaasSubscriptionManagement } from "@/application/saas-administration/use-cases/manage-subscriptions";
import { listSaasPlanCatalog } from "@/application/saas-administration/use-cases/manage-plan-catalog";
import { BusinessRuleViolationError, NotFoundError } from "@/domain/shared/errors";
import { formatMoney } from "@/lib/format-money";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { Surface } from "@/presentation/components/primitives";
import { loadBackofficeContext } from "../../../_lib/backoffice-context";
import { AssignmentForm } from "./assignment-form";
import { CancelScheduledChangeForm, PlanChangeForm } from "./plan-change-form";
import { RenewalForm } from "./renewal-form";
import { getSaasRenewalConfiguration } from "@/infrastructure/composition/saas-renewal-composition";

const statusLabels = { trial: "En prueba", active: "Activa", past_due: "En mora", suspended: "Suspendida" };
const paymentLabels = { pending: "Pendiente", paid: "Pagado", failed: "Fallido", partial: "Parcial histórico", not_due: "Sin cobro exigible al asignar" };

export default async function TenantSubscriptionPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const [{ tenantId }, { deps, shell }] = await Promise.all([params, loadBackofficeContext()]);
  if (!z.uuid().safeParse(tenantId).success) notFound();
  let management;
  let plans;
  let allowPlanChange = false;
  try {
    management = await getSaasSubscriptionManagement(tenantId, deps.subscriptions);
    allowPlanChange = management.subscription?.currency === "CLP" && Number.isInteger(management.subscription.price)
      && management.subscription.status !== "trial" && management.scheduledChange?.status !== "scheduled"
      && management.subscription.periodStartsOn <= management.businessDate
      && management.subscription.periodEndExclusive > management.businessDate;
    plans = !management.subscription || allowPlanChange ? await listSaasPlanCatalog(deps.planCatalog) : [];
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (!(error instanceof BusinessRuleViolationError)) throw error;
    return <BackofficeShell title="Suscripción del tenant" current="tenants" {...shell}>
      <Surface><h2 className="font-bold">Gestión pendiente de configuración</h2><p role="alert" className="mt-2 text-sm text-destructive">{error.message}</p></Surface>
    </BackofficeShell>;
  }
  const subscription = management.subscription;
  const renewalConfiguration = getSaasRenewalConfiguration();
  const assignable = plans.filter((p) => p.status === "active" && p.currentVersion.currency === "CLP" && Number.isInteger(p.currentVersion.price));
  return (
    <BackofficeShell title="Suscripción del tenant" description={management.tenantName} current="tenants" {...shell}>
      <div className="mx-auto grid max-w-3xl gap-5">
        <Link href={`/backoffice/tenants?tenant=${tenantId}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground">Volver a {management.tenantName}</Link>
        <Link href={`/backoffice/collections?tenant=${tenantId}`} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-border px-3 text-sm font-semibold">Ver cobros de esta academia</Link>
        <Surface>
          <h2 className="break-words text-lg font-bold">{management.tenantName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Uso actual: {management.activeStudents} alumnos · {management.activeUsers} usuarios activos</p>
          {subscription ? <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted-foreground">Plan contratado</dt><dd className="font-semibold">{subscription.planName ?? "Contrato histórico sin nombre de versión"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Estado de suscripción</dt><dd>{statusLabels[subscription.status]}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Precio por período</dt><dd className="font-semibold">{formatMoney(subscription.price, subscription.currency)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Estado de cobro</dt><dd>{paymentLabels[subscription.paymentStatus]}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Período vigente</dt><dd>{subscription.periodStartsOn} hasta antes del {subscription.periodEndExclusive}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Próxima facturación</dt><dd>{subscription.nextBillingDate ?? "No programada"}</dd></div>
          </dl> : <p className="mt-3 text-sm">Sin suscripción vigente. Puedes revisar y asignar un plan a continuación.</p>}
        </Surface>
        {management.scheduledChange ? <Surface>
          <h2 className="font-bold">{management.scheduledChange.status === "scheduled" ? "Cambio programado" : "Cambio bloqueado"}</h2>
          <p className="mt-2 break-words text-sm">{management.scheduledChange.planName} · {management.scheduledChange.effectiveOn}</p>
          <p className="mt-1 text-sm">Precio por período: {formatMoney(management.scheduledChange.price, management.scheduledChange.currency)}, IVA incluido para CLP.</p>
          <p className="mt-1 text-xs text-muted-foreground">{management.scheduledChange.reason}</p>
          {management.scheduledChange.blockedReason ? <p role="alert" className="mt-2 text-sm text-destructive">{management.scheduledChange.blockedReason}</p> : null}
          {management.scheduledChange.status === "scheduled" ? <CancelScheduledChangeForm tenantId={tenantId} scheduledChangeId={management.scheduledChange.id} operationId={randomUUID()} /> : null}
        </Surface> : null}
        {!subscription ? <AssignmentForm tenantId={tenantId} tenantName={management.tenantName} plans={assignable} businessDate={management.businessDate} operationId={randomUUID()} /> : (
          allowPlanChange
            ? <PlanChangeForm tenantId={tenantId} currentVersionId={subscription.planVersionId} plans={assignable} operationId={randomUUID()} />
            : <Surface><p className="text-sm text-muted-foreground">La asignación inicial está cerrada porque existe un contrato vigente. Para un nuevo cambio comercial, el período debe estar iniciado y sin vencer: revisa la renovación si corresponde, termina la prueba, concilia monedas históricas o cancela primero el cambio programado.</p></Surface>
        )}
        {subscription?.currency === "CLP" && Number.isInteger(subscription.price)
          && subscription.periodEndExclusive <= management.businessDate ? <RenewalForm
            subscriptionId={subscription.id} tenantId={tenantId} expectedPeriodEnd={subscription.periodEndExclusive}
            requestId={randomUUID()} price={subscription.price} enabled={renewalConfiguration.enabled}
            scheduledPrice={management.scheduledChange?.status === "scheduled" ? management.scheduledChange.price : null}
          /> : null}
        <p className="text-xs text-muted-foreground">Las renovaciones requieren validación PostgreSQL y un scheduler habilitado; no dependen de visitar esta página. <Link href="/backoffice/finance/renewals" className="underline">Revisar procesador y cambios bloqueados</Link>.</p>
      </div>
    </BackofficeShell>
  );
}
