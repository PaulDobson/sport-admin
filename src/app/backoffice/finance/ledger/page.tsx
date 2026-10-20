import Link from "next/link";
import { getFinancialLedger } from "@/application/saas-administration/use-cases/get-financial-ledger";
import { BusinessRuleViolationError,ValidationError } from "@/domain/shared/errors";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { Surface } from "@/presentation/components/primitives";
import { formatMoney } from "@/lib/format-money";
import { loadBackofficeContext } from "../../_lib/backoffice-context";
const labels = { collected: "Cobrado neto",pending: "Pendiente al cierre",past_due: "Mora al cierre",mrr: "MRR contratado al cierre" };
export default async function FinancialLedgerPage({ searchParams }: { searchParams: Promise<{ period?: string; currency?: string; metric?: string; page?: string }> }) {
  const [{ deps,shell },params] = await Promise.all([loadBackofficeContext(),searchParams]);
  let result;
  try { result = await getFinancialLedger({
    period: `${params.period ?? new Date().toISOString().slice(0,7)}-01`,currency: params.currency ?? "CLP",
    metric: params.metric ?? "collected",page: params.page === undefined ? 1 : Number(params.page),
  },deps.financialLedger); }
  catch (error) {
    if (!(error instanceof BusinessRuleViolationError || error instanceof ValidationError)) throw error;
    return <BackofficeShell title="Detalle financiero" current="finance" {...shell}><Surface><p role="alert" className="text-sm text-destructive">{error instanceof ValidationError ? error.issues.map((i) => i.message).join(" ") : error.message}</p></Surface></BackofficeShell>;
  }
  const query = new URLSearchParams({ period: result.period.slice(0,7),currency: result.currency,metric: result.metric });
  const href = (page: number) => `/backoffice/finance/ledger?${query}&page=${page}`;
  return <BackofficeShell title={labels[result.metric]} description={`${result.period.slice(0,7)} · ${result.currency} · UTC`} current="finance" {...shell}>
    <div className="grid gap-5">
      <Link href={`/backoffice/finance?period=${result.period.slice(0,7)}&currency=${result.currency}`} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-border px-3 text-sm font-semibold">Volver a indicadores</Link>
      <Surface><h2 className="text-lg font-bold">{labels[result.metric]}: {formatMoney(result.amount,result.currency)}</h2><p className="mt-2 text-sm text-muted-foreground">{result.total} registros. Total calculado sobre todas las páginas, no solo las filas visibles.</p>
        <p className="mt-2 text-xs text-muted-foreground">El saldo se reconstruye al cierre del mes con pagos anteriores al límite UTC. Cobrado neto resta reembolsos confirmados. MRR usa la duración histórica; no es efectivo recibido. Los importes no se convierten entre monedas.</p></Surface>
      {result.entries.map((e) => <Surface key={e.id}><h3 className="break-words font-semibold">{e.tenant_name}</h3><p className="mt-1 text-sm">{e.label} · {formatMoney(e.amount,result.currency)}</p><p className="mt-1 text-xs text-muted-foreground">{e.event_at ?? "Sin fecha de vencimiento"}</p>
        <Link href={e.invoice_id ? `/backoffice/collections/${e.invoice_id}` : `/backoffice/tenants/${e.tenant_id}/subscription`} className="mt-2 inline-flex min-h-11 items-center text-sm underline">{e.invoice_id ? "Revisar cobro actual" : "Ver contrato actual"}</Link></Surface>)}
      {!result.entries.length ? <Surface><p className="text-sm">Sin registros en esta página.</p></Surface> : null}
      <nav aria-label="Paginación financiera" className="flex justify-between gap-3 text-sm">
        {result.page > 1 ? <Link href={href(result.page-1)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3">Anterior</Link> : <span />}
        <span className="self-center">Página {result.page}</span>
        {result.page*20 < result.total ? <Link href={href(result.page+1)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3">Siguiente</Link> : <span />}
      </nav>
    </div>
  </BackofficeShell>;
}
