import Link from "next/link";
import { FileText, Settings2 } from "lucide-react";
import { listSaasCollections } from "@/application/saas-administration/use-cases/list-collections";
import type { CollectionsPage, SaasCollection } from "@/domain/saas-administration/collections";
import { collectionStatuses } from "@/domain/saas-administration/collections";
import { BusinessRuleViolationError, ValidationError } from "@/domain/shared/errors";
import { formatMoney } from "@/lib/format-money";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { Surface } from "@/presentation/components/primitives";
import { loadBackofficeContext } from "../_lib/backoffice-context";
import { collectionDetailHref, collectionFiltersFromSearch, collectionListHref, collectionStatusLabels, type CollectionSearch } from "./collection-links";
import { CollectionBadge } from "./collection-badge";

const control = "h-11 min-w-0 rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground";

export default async function SaasCollectionsPage({ searchParams }: { searchParams: Promise<CollectionSearch> }) {
  const [{ deps, shell }, params] = await Promise.all([loadBackofficeContext(), searchParams]);
  let result: CollectionsPage | null = null;
  let filters;
  let errorMessage: string | null = null;
  try {
    filters = collectionFiltersFromSearch(params);
    result = await listSaasCollections(filters, deps.collections);
  } catch (error) {
    if (error instanceof ValidationError) errorMessage = error.issues.map((i) => i.message).join(" ");
    else if (error instanceof BusinessRuleViolationError) errorMessage = error.message;
    else throw error;
  }
  const activeFilters = filters;
  return <BackofficeShell title="Cobranza" description="Cobros del servicio SaaS · separado de los pagos de alumnos" current="collections" {...shell}>
    <div className="grid gap-5">
      <Surface>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-lg font-bold"><FileText aria-hidden className="h-4 w-4 shrink-0" />Cartera de cobros</h2>
            <p className="mt-1 text-sm text-muted-foreground">Revisa deuda, pagos históricos e intentos en curso sin mezclar monedas.</p></div>
          <Link href="/backoffice/finance/issuer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold">
            <Settings2 aria-hidden className="h-4 w-4 shrink-0" />Configurar emisor</Link>
        </div>
        <form method="get" aria-label="Filtros de cobranza" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {params.tenant ? <input type="hidden" name="tenant" value={params.tenant} /> : null}
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">Academia<input name="q" type="search" maxLength={160} defaultValue={params.q} className={control} /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">Estado<select name="status" defaultValue={params.status ?? "all"} className={control}>
            {collectionStatuses.map((s) => <option key={s} value={s}>{collectionStatusLabels[s]}</option>)}
          </select></label>
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">Moneda<input name="currency" maxLength={3} placeholder="Todas · CLP, USD, EUR…" defaultValue={params.currency} className={control} /></label>
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted-foreground">Vencimiento desde<input name="from" type="date" defaultValue={params.from} className={`${control} w-full`} /></label>
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted-foreground">Vencimiento hasta<input name="until" type="date" defaultValue={params.until} className={`${control} w-full`} /></label>
          <div className="flex flex-wrap items-end gap-2"><button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Filtrar</button>
            <Link href="/backoffice/collections" className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold">Limpiar filtros</Link></div>
        </form>
        {params.tenant ? <p className="mt-3 break-all text-xs text-muted-foreground">Limitado al tenant {params.tenant}. Usa «Limpiar filtros» para ver toda la cartera.</p> : null}
      </Surface>
      {errorMessage ? <Surface><p role="alert" className="text-sm text-destructive">{errorMessage}</p></Surface> : null}
      {result && activeFilters ? <>
        <p role="status" className="text-sm text-muted-foreground">{result.total} {result.total === 1 ? "cobro" : "cobros"} · Fecha financiera de Chile: {result.businessDate}</p>
        <p className="text-xs text-muted-foreground">Vencido: saldo positivo con fecha de pago alcanzada. El IVA incluido no reduce la deuda. Los reembolsos no reabren cobros.</p>
        {!result.items.length ? <Surface><h2 className="font-semibold">Sin cobros en esta página</h2><p className="mt-1 text-sm text-muted-foreground">Revisa los filtros o vuelve a una página anterior. No se modificó ningún registro.</p></Surface> : null}
        <div className="grid gap-4 md:grid-cols-2 lg:hidden">{result.items.map((i) => <Surface key={i.id} className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><CollectionBadge invoice={i} /><span className="break-all text-xs text-muted-foreground">{i.invoiceNumber}</span></div>
          <h3 className="break-words font-bold">{i.tenantName}</h3><p className="break-words text-sm text-muted-foreground">{i.planName ?? "Contrato histórico sin nombre registrado"}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Saldo exigible</dt><dd className="break-words text-lg font-bold tabular-nums">{formatMoney(i.balance, i.currency)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Vencimiento</dt><dd>{i.dueOn ?? "Sin fecha"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Importe emitido</dt><dd>{formatMoney(i.amount, i.currency)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Pagos registrados</dt><dd>{formatMoney(i.confirmedAmount, i.currency)}</dd></div></dl>
          <CollectionNotes invoice={i} />
          <Link href={collectionDetailHref(i.id, activeFilters)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold">Ver detalle</Link>
        </Surface>)}</div>
        {result.items.length ? <Surface className="hidden lg:block"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <caption className="sr-only">Cobros SaaS y saldo calculado desde pagos confirmados</caption>
          <thead className="border-b border-border text-xs text-muted-foreground"><tr>{["Academia / cobro", "Estado", "Vencimiento", "Emitido", "Saldo", "Detalle"].map((h) => <th key={h} scope="col" className="p-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">{result.items.map((i) => <tr key={i.id} className="align-top">
            <th scope="row" className="max-w-xs p-3 font-normal"><p className="break-words font-semibold">{i.tenantName}</p><p className="break-all text-xs text-muted-foreground">{i.invoiceNumber}</p><CollectionNotes invoice={i} /></th>
            <td className="p-3"><CollectionBadge invoice={i} /></td><td className="p-3">{i.dueOn ?? "Sin fecha"}</td>
            <td className="p-3 tabular-nums">{formatMoney(i.amount, i.currency)}</td><td className="p-3 font-semibold tabular-nums">{formatMoney(i.balance, i.currency)}</td>
            <td className="p-3"><Link href={collectionDetailHref(i.id, activeFilters)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 font-semibold">Ver detalle</Link></td>
          </tr>)}</tbody></table></div></Surface> : null}
        <nav aria-label="Paginación de cobros" className="flex flex-wrap items-center justify-between gap-3 text-sm">
          {result.page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border px-4" href={collectionListHref(activeFilters, result.page - 1)}>Anterior</Link> : <span />}
          <span>Página {result.page} de {Math.max(1, Math.ceil(result.total / result.pageSize))}</span>
          {result.page * result.pageSize < result.total ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border px-4" href={collectionListHref(activeFilters, result.page + 1)}>Siguiente</Link> : <span />}
        </nav>
      </> : null}
    </div>
  </BackofficeShell>;
}

function CollectionNotes({ invoice }: { invoice: SaasCollection }) {
  return <>{invoice.importedSettlement ? <p className="mt-1 text-xs text-muted-foreground">Liquidación histórica importada; sin transacciones registradas.</p> : null}
    {invoice.inFlightCount > 0 ? <p className="mt-1 text-xs text-warning">{invoice.inFlightCount} operaciones en curso. No registrar otro pago.</p> : null}</>;
}
