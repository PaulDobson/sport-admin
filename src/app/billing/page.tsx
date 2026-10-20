import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createOwnerBillingDeps } from "@/infrastructure/composition/owner-billing-composition";
import { getOwnerBilling } from "@/application/saas-administration/use-cases/get-owner-billing";
import type { OwnerBilling } from "@/domain/saas-administration/owner-billing";
import { BusinessRuleViolationError,UnauthorizedError,ValidationError } from "@/domain/shared/errors";
import { Surface } from "@/presentation/components/primitives";
import { formatMoney } from "@/lib/format-money";
import { formatSaasFeature } from "@/lib/format-saas-feature";
import { collectionStatusLabels } from "@/app/backoffice/collections/collection-links";
import { signOutAction } from "@/app/dashboard/profile/sign-out-action";
const subscriptionLabels = { trial: "Prueba",active: "Activa",past_due: "Con deuda vencida",suspended: "Suspendida",cancelled: "Cancelada",expired: "Expirada" };
const paymentLabels = { pending: "Pendiente",paid: "Pagado",failed: "Fallido",partial: "Con saldo pendiente",not_due: "Sin cobro exigible" };

export default async function OwnerBillingPage({ searchParams }: { searchParams: Promise<{ tenant?: string; page?: string }> }) {
  const { auth,memberships } = await createAuthDeps();
  const userId = await auth.getCurrentUserId();
  if (!userId) redirect("/log-in?next=/billing");
  const [active,operational] = await Promise.all([memberships.findActiveByUser(userId),memberships.findOperationalByUser(userId)]);
  const owners = active.filter((m) => m.role === "owner");
  const params = await searchParams;
  const tenantId = params.tenant ?? owners[0]?.tenantId;
  let billing: OwnerBilling | null = null;
  let message: string | null = null;
  try {
    if (!tenantId || !owners.some((m) => m.tenantId === tenantId)) throw new UnauthorizedError("Esta consulta está disponible solo para el dueño con membresía activa de la academia.");
    const { ownerBilling } = await createOwnerBillingDeps();
    billing = await getOwnerBilling({ tenantId,page: params.page === undefined ? 1 : Number(params.page) },ownerBilling);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof BusinessRuleViolationError) message = error.message;
    else if (error instanceof ValidationError) message = "La página o academia solicitada no es válida.";
    else throw error;
  }
  const s = billing?.subscription;
  return <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6">
    <div className="mx-auto grid max-w-4xl gap-5">
      <div><p className="text-xs font-semibold text-primary">Cuenta de la academia</p><h1 className="mt-1 text-2xl font-bold">Mi suscripción</h1><p className="mt-2 text-sm text-muted-foreground">Servicio contratado con la plataforma. No corresponde a los pagos de alumnos.</p></div>
      <div className="flex flex-wrap gap-3">{operational.length ? <Link href="/dashboard" className="inline-flex min-h-11 w-fit items-center rounded-lg border border-border px-3 text-sm font-semibold">Volver a la plataforma</Link> : null}
        <form action={signOutAction}><button className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold">Cerrar sesión</button></form></div>
      {billing && billing.owner_tenants.length > 1 ? <form method="get" className="grid gap-2 sm:flex"><label className="grid gap-1 text-sm">Academia<select name="tenant" defaultValue={tenantId} className="h-11 min-w-0 rounded-lg border border-input bg-card px-3">{billing.owner_tenants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><button className="min-h-11 self-end rounded-lg border border-border px-4 text-sm">Consultar</button></form> : null}
      {message ? <Surface><p role="alert" className="text-sm text-destructive">{message}</p></Surface> : null}
      {billing ? <>
        <Surface><h2 className="break-words text-lg font-bold">{billing.tenant_name}</h2>
          <p className="mt-2 text-sm font-semibold">Deuda total: {billing.balances.map((b) => formatMoney(b.amount,b.currency)).join(" · ") || "Sin saldo pendiente"}</p>
          {billing.tenant_status === "suspended" ? <p role="status" className="mt-2 text-sm text-warning">Academia suspendida. Esta consulta no reactiva el acceso operativo.</p> : null}
          {s ? <><h3 className="mt-4 font-semibold">{s.plan_name ?? "Plan histórico"}</h3><p className="mt-1 text-2xl font-bold">{formatMoney(s.price,s.currency)}</p>
            <p className="mt-2 text-sm">Suscripción: {subscriptionLabels[s.status]} · Pago: {paymentLabels[s.payment_status]}.</p>
            <p className="mt-1 text-sm text-muted-foreground">Cada {s.duration_count} {s.duration_unit === "months" ? "mes(es)" : "día(s)"} · período {s.period_starts_on} a {s.period_end_exclusive} (fin exclusivo).</p>
            <p className="mt-2 text-sm">Límites: {s.max_students} alumnos · {s.max_users} usuarios.</p><p className="mt-1 text-sm">Funciones: {s.features.map(formatSaasFeature).join(", ") || "Sin funciones adicionales"}</p>
            <ul className="mt-3 list-inside list-disc text-sm">{s.services.map((service,index) => <li key={index} className="break-words">{service}</li>)}</ul></>
            : <p className="mt-3 text-sm text-muted-foreground">No hay una suscripción registrada.</p>}
          {billing.scheduled_change ? <p className="mt-4 rounded-lg border border-border p-3 text-sm">Cambio {billing.scheduled_change.status === "blocked" ? "bloqueado" : "programado"}: {billing.scheduled_change.plan_name} · {formatMoney(billing.scheduled_change.price,billing.scheduled_change.currency)} desde {billing.scheduled_change.effective_on}. {billing.scheduled_change.blocked_reason}</p> : null}
        </Surface>
        <h2 className="text-lg font-bold">Cobros y pagos del servicio</h2>
        {!billing.invoices.length ? <Surface><p className="text-sm text-muted-foreground">No hay cobros en esta página.</p></Surface> : null}
        {billing.invoices.map((i) => <Surface key={i.id}><div className="flex flex-wrap justify-between gap-2"><h3 className="break-all font-semibold">{i.invoice_number}</h3><span className="text-sm">{collectionStatusLabels[i.status]}</span></div>
          <p className="mt-2 text-sm">Importe {formatMoney(i.amount,i.currency)} · Saldo {formatMoney(i.balance,i.currency)} · Vence {i.due_on ?? "sin fecha"}.</p>
          {i.imported_settlement ? <p className="mt-2 text-xs text-muted-foreground">Liquidación histórica importada, sin transacciones registradas.</p> : null}
          <ul className="mt-2 grid gap-2 text-sm">{i.payments.map((p,index) => <li key={index}>Pago {formatMoney(p.amount,p.currency)} · {p.occurred_at} {p.status === "refunded" ? "· reembolsado" : ""}</li>)}</ul>
          <ul className="mt-3 grid gap-2">{i.receipts.map((r) => <li key={r.id}>{r.ready
            ? <a href={`/api/saas/receipts/${r.id}/download`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold">Descargar comprobante {r.folio}</a>
            : <p className="text-sm text-muted-foreground">Comprobante {r.folio}: PDF en preparación; el pago está registrado.</p>}</li>)}</ul>
        </Surface>)}
        <nav aria-label="Paginación de mi suscripción" className="flex flex-wrap justify-between gap-3 text-sm">
          {billing.page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border px-4" href={`/billing?tenant=${billing.tenant_id}&page=${billing.page-1}`}>Anterior</Link> : <span />}
          <span className="self-center">Página {billing.page}</span>
          {billing.page * 20 < billing.total ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border px-4" href={`/billing?tenant=${billing.tenant_id}&page=${billing.page+1}`}>Siguiente</Link> : <span />}
        </nav>
      </> : null}
    </div>
  </main>;
}
