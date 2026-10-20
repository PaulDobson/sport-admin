import Link from "next/link";
import { FileText, Mail } from "lucide-react";
import { documentJobFilters, documentJobKinds, type DocumentJobFilters, type DocumentJobsPage } from "@/domain/saas-administration/document-jobs";
import { Surface } from "@/presentation/components/primitives";

export type DocumentJobSearch = { q?: string; kind?: string; status?: string; page?: string };
const kindLabels = { all: "Todos", receipt_pdf: "Generación PDF", receipt_email: "Envío de correo" };
const statusLabels = {
  attention: "Requieren atención", all: "Todos", queued: "En cola", running: "En proceso",
  succeeded: "Completado", failed: "Fallido", unknown: "Resultado incierto",
};
const dateTime = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago",
});
const control = "h-11 min-w-0 rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground";

function pageHref(filters: DocumentJobFilters, page: number) {
  const query = new URLSearchParams({ kind: filters.kind, status: filters.status, page: String(page) });
  if (filters.query) query.set("q", filters.query);
  return `/backoffice/finance/documents?${query}#trabajos`;
}

type Job = DocumentJobsPage["items"][number];
function JobState({ job }: { job: Job }) {
  const label = job.lease_expired ? "Lease vencido: requiere recuperación"
    : job.status === "succeeded" && job.kind === "receipt_email" ? "Enviado al proveedor / conciliado"
    : statusLabels[job.status];
  return <div className="grid gap-1">
    <p className="font-semibold">{label}</p>
    {job.status === "unknown" || (job.lease_expired && job.kind === "receipt_email")
      ? <p className="text-xs text-warning">No reenviar automáticamente. El worker marca el lease de correo vencido como incierto; concilia con el proveedor antes de solicitar otro envío.</p>
      : null}
    {job.last_error ? <p className="break-all text-xs text-destructive">Código: {job.last_error}</p> : null}
  </div>;
}

function JobTiming({ job }: { job: Job }) {
  return <div className="grid gap-1 text-xs text-muted-foreground">
    <p>Creado: {dateTime.format(new Date(job.created_at))}</p>
    {job.status === "queued" ? <p>Disponible desde: {dateTime.format(new Date(job.available_at))}</p> : null}
    {job.lease_expires_at ? <p>Lease hasta: {dateTime.format(new Date(job.lease_expires_at))}</p> : null}
    {job.completed_at ? <p>Completado: {dateTime.format(new Date(job.completed_at))}</p> : null}
  </div>;
}

function ReceiptLink({ job }: { job: Job }) {
  return <Link href={`/backoffice/receipts/${job.receipt_id}`}
    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold">
    Revisar comprobante {job.folio}
  </Link>;
}

export function DocumentJobList({ result, filters, params, error }: {
  result: DocumentJobsPage | null; filters: DocumentJobFilters | null;
  params: DocumentJobSearch; error: string | null;
}) {
  return <section id="trabajos" aria-labelledby="trabajos-title" className="grid min-w-0 scroll-mt-6 gap-4">
    <Surface>
      <h2 id="trabajos-title" className="text-lg font-bold">Bandeja de PDF y correo</h2>
      <p className="mt-2 text-sm text-muted-foreground">Identifica el comprobante que requiere revisión. Consultar o filtrar no ejecuta trabajos, registra pagos ni envía mensajes.</p>
      <form method="get" aria-label="Filtros de trabajos" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted-foreground">Academia
          <input name="q" type="search" maxLength={160} defaultValue={params.q} className={control} />
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted-foreground">Tipo de trabajo
          <select name="kind" defaultValue={filters?.kind ?? "all"} className={control}>
            {documentJobKinds.map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-muted-foreground">Estado
          <select name="status" defaultValue={filters?.status ?? "attention"} className={control}>
            {documentJobFilters.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Filtrar</button>
          <Link href="/backoffice/finance/documents#trabajos" className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold">Limpiar</Link>
        </div>
      </form>
    </Surface>
    {error ? <Surface><p role="alert" className="text-sm text-destructive">{error}</p></Surface> : null}
    {result && filters ? <>
      <p role="status" className="text-sm text-muted-foreground">{result.total} trabajos · Consulta: {dateTime.format(new Date(result.queried_at))} (Chile).</p>
      {filters.status === "attention" ? <p className="text-xs text-muted-foreground">Incluye fallos, resultados inciertos y trabajos en proceso con lease vencido. Los reintentos automáticos PDF pendientes se consultan con «En cola».</p> : null}
      {!result.items.length ? <Surface><h3 className="font-semibold">Sin trabajos en esta página</h3><p className="mt-1 text-sm text-muted-foreground">No hay coincidencias con estos filtros. Revisa otra página o consulta todos los estados.</p></Surface> : <>
        <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:hidden">
          {result.items.map((job) => {
            const Icon = job.kind === "receipt_pdf" ? FileText : Mail;
            return <Surface key={job.id} className="grid min-w-0 gap-3">
              <h3 className="break-words font-bold">{job.tenant_name}</h3>
              <p className="flex items-center gap-2 text-sm"><Icon aria-hidden className="h-4 w-4 shrink-0" />{kindLabels[job.kind]} · Folio {job.folio}</p>
              <JobState job={job} />
              <p className="text-sm">Intentos: {job.attempts} / {job.max_attempts}</p>
              <JobTiming job={job} /><ReceiptLink job={job} />
            </Surface>;
          })}
        </div>
        <Surface className="hidden min-w-0 lg:block"><div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Trabajos de generación PDF y entrega de comprobantes</caption>
            <thead className="border-b border-border text-xs text-muted-foreground"><tr>
              {["Academia / documento", "Estado", "Intentos", "Fechas (Chile)", "Revisión"].map((label) => <th key={label} scope="col" className="p-3">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border">{result.items.map((job) => <tr key={job.id} className="align-top">
              <th scope="row" className="max-w-xs p-3 font-normal"><p className="break-words font-semibold">{job.tenant_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{kindLabels[job.kind]} · Folio {job.folio}</p></th>
              <td className="max-w-sm p-3"><JobState job={job} /></td>
              <td className="p-3 tabular-nums">{job.attempts} / {job.max_attempts}</td>
              <td className="p-3"><JobTiming job={job} /></td>
              <td className="p-3"><ReceiptLink job={job} /></td>
            </tr>)}</tbody>
          </table>
        </div></Surface>
      </>}
      <nav aria-label="Paginación de trabajos" className="flex flex-wrap items-center justify-between gap-3 pb-24 text-sm lg:pb-0">
        {result.page > 1 ? <Link href={pageHref(filters, result.page - 1)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-4">Anterior</Link> : <span />}
        <span>Página {result.page} de {Math.max(1, Math.ceil(result.total / result.page_size))}</span>
        {result.page * result.page_size < result.total ? <Link href={pageHref(filters, result.page + 1)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-4">Siguiente</Link> : <span />}
      </nav>
    </> : null}
  </section>;
}
