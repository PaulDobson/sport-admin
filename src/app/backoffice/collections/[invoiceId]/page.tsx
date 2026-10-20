import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getSaasCollection } from "@/application/saas-administration/use-cases/list-collections";
import { BusinessRuleViolationError, NotFoundError } from "@/domain/shared/errors";
import { formatMoney } from "@/lib/format-money";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { Surface } from "@/presentation/components/primitives";
import { loadBackofficeContext } from "../../_lib/backoffice-context";
import { CollectionBadge } from "../collection-badge";
import { getSaasBillingIssuer } from "@/application/saas-administration/use-cases/manage-billing-issuer";
import { PaymentForm } from "./payment-form";

const chargeLabels = { pending: "Pendiente", processing: "En proceso", succeeded: "Confirmado", failed: "Fallido", refunded: "Reembolsado" };
const refundLabels = { pending: "Pendiente", processing: "En proceso", succeeded: "Confirmado", failed: "Fallido", cancelled: "Cancelado" };
const methodLabels = { transfer: "Transferencia", cash: "Efectivo", external_card: "Tarjeta externa" };

export default async function CollectionDetailPage({ params, searchParams }: {
  params: Promise<{ invoiceId: string }>; searchParams: Promise<{ back?: string }>;
}) {
  const [{ deps, shell }, { invoiceId }, search] = await Promise.all([loadBackofficeContext(), params, searchParams]);
  if (!z.uuid().safeParse(invoiceId).success) notFound();
  let detail;
  let issuer;
  let receipts;
  try {
    [detail,issuer,receipts] = await Promise.all([
      getSaasCollection(invoiceId,deps.collections),getSaasBillingIssuer(deps.billingIssuer),deps.billingPayments.listReceipts(invoiceId),
    ]);
  }
  catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (!(error instanceof BusinessRuleViolationError)) throw error;
    return <BackofficeShell title="Detalle de cobro" current="collections" {...shell}><Surface><p role="alert" className="text-sm text-destructive">{error.message}</p></Surface></BackofficeShell>;
  }
  const i = detail.invoice;
  const open = ["open","past_due"].includes(i.status);
  const back = `/backoffice/collections${search.back ? `?${new URLSearchParams(search.back).toString()}` : ""}`;
  return <BackofficeShell title="Detalle de cobro" description={i.invoiceNumber} current="collections" {...shell}>
    <div className="grid gap-5">
      <Link href={back} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-border px-3 text-sm font-semibold">Volver a cobranza</Link>
      <Surface>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="break-words text-lg font-bold">{i.tenantName}</h2><p className="break-all text-sm text-muted-foreground">{i.invoiceNumber}</p></div><CollectionBadge invoice={i} /></div>
        <p className="mt-2 text-sm text-muted-foreground">{i.planName ?? "Contrato histórico sin nombre registrado"} · {i.kind === "upgrade" ? "Diferencia proporcional por upgrade" : i.kind === "renewal" ? "Renovación" : i.kind === "initial" ? "Contratación inicial" : "Cobro histórico"}</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {[["Saldo exigible", formatMoney(i.balance, i.currency)], ["Importe emitido", formatMoney(i.amount, i.currency)], ["Pagos confirmados", formatMoney(i.confirmedAmount, i.currency)],
            ["Vencimiento", i.dueOn ?? "Sin fecha"], ["Inicio del servicio", i.periodStartsOn], ["Fin del servicio (exclusivo)", i.periodEndExclusive ?? "No registrado"]].map(([label, value]) =>
            <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-semibold tabular-nums">{value}</dd></div>)}
        </dl>
        {i.importedSettlement ? <p className="mt-4 text-sm text-muted-foreground">Cobro liquidado mediante importación histórica. No se inventaron transacciones para representar ese pago.</p> : null}
        {i.inFlightCount ? <p role="status" className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">Hay {i.inFlightCount} operaciones en curso. Deben conciliarse antes de registrar otro pago.</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/backoffice/tenants/${i.tenantId}/subscription`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold">Ver suscripción</Link>
          <Link href="/backoffice/finance/issuer" className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold">Revisar emisor</Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Consultar esta pantalla no modifica el libro financiero.</p>
      </Surface>
      {open && i.currency === "CLP" && i.inFlightCount === 0 && i.balance > 0 && Number.isInteger(i.balance)
        ? issuer ? <PaymentForm invoiceId={i.id} amount={i.balance} businessDate={detail.businessDate} operationId={randomUUID()} intent="pay" issuerName={issuer.legalName} />
          : <Surface><p role="alert" className="text-sm text-warning">Configura el emisor antes de registrar pagos con comprobante.</p></Surface> : null}
      {(open || i.status === "draft") && i.confirmedAmount === 0 && i.inFlightCount === 0
        ? <details><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-destructive">Anular este cobro</summary>
          <PaymentForm invoiceId={i.id} amount={i.balance} businessDate={detail.businessDate} operationId={randomUUID()} intent="void" /></details> : null}
      {receipts.length ? <Surface><h2 className="font-bold">Comprobantes de pago</h2><ul className="mt-3 grid gap-2">{receipts.map((r) =>
        <li key={r.id}><Link href={`/backoffice/receipts/${r.id}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline">Comprobante {r.folio} · {formatMoney(r.total,"CLP")} · {r.ready ? "PDF disponible" : "PDF pendiente"}</Link></li>)}</ul></Surface> : null}
      <Surface><h2 className="font-bold">Historial de pagos e intentos</h2>
        <p className="mt-1 text-xs text-muted-foreground">Fechas de eventos en UTC. Solo los pagos confirmados reducen el saldo.</p>
        {detail.chargeCount > detail.charges.length ? <p role="status" className="mt-2 text-sm text-warning">Se muestran los últimos {detail.charges.length} de {detail.chargeCount} eventos.</p> : null}
        {!detail.charges.length ? <p className="mt-3 text-sm text-muted-foreground">Sin transacciones registradas.</p> : <ul className="mt-3 divide-y divide-border">{detail.charges.map((c) =>
          <li key={c.id} className="grid min-w-0 gap-1 py-3 text-sm"><p className="font-semibold">{chargeLabels[c.status]} · {formatMoney(c.amount, c.currency)}</p>
            <p className="break-words text-muted-foreground">{c.manualMethod ? methodLabels[c.manualMethod] : c.provider ?? "Registro histórico"} · {c.occurredAt}</p>
            {c.manualReference ? <p className="break-words">Referencia: {c.manualReference}</p> : null}<p className="break-all text-xs text-muted-foreground">ID: {c.id}</p></li>)}</ul>}
      </Surface>
      <Surface><h2 className="font-bold">Reembolsos históricos</h2><p className="mt-1 text-xs text-muted-foreground">Se muestran por separado; no se convierten en nueva deuda ni habilitan devoluciones nuevas.</p>
        {detail.refundCount > detail.refunds.length ? <p role="status" className="mt-2 text-sm text-warning">Se muestran los últimos {detail.refunds.length} de {detail.refundCount} reembolsos.</p> : null}
        {!detail.refunds.length ? <p className="mt-3 text-sm text-muted-foreground">Sin reembolsos registrados.</p> : <ul className="mt-3 divide-y divide-border">{detail.refunds.map((r) =>
          <li key={r.id} className="grid min-w-0 gap-1 py-3 text-sm"><p className="font-semibold">{refundLabels[r.status]} · {formatMoney(r.amount, r.currency)}</p>
            <p className="break-words">{r.reason}</p><p className="break-words text-xs text-muted-foreground">Solicitado: {r.requestedAt} · Procesado: {r.processedAt ?? "Pendiente"}</p></li>)}</ul>}
      </Surface>
    </div>
  </BackofficeShell>;
}
