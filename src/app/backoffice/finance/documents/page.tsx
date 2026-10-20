import Link from "next/link";
import { BusinessRuleViolationError, ValidationError } from "@/domain/shared/errors";
import type { DocumentJobFilters, DocumentJobsPage } from "@/domain/saas-administration/document-jobs";
import { listSaasDocumentJobs, parseDocumentJobFilters } from "@/application/saas-administration/use-cases/list-document-jobs";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { Surface } from "@/presentation/components/primitives";
import { getSaasDocumentConfiguration,getSaasDocumentProcessorStatus } from "@/infrastructure/composition/saas-documents-composition";
import { loadBackofficeContext } from "../../_lib/backoffice-context";
import { DocumentJobList, type DocumentJobSearch } from "./document-job-list";

export default async function DocumentProcessorPage({ searchParams }: { searchParams?: Promise<DocumentJobSearch> } = {}) {
  const { deps, shell } = await loadBackofficeContext();
  const params = await searchParams ?? {};
  const config = getSaasDocumentConfiguration();
  let status;
  try { status = await getSaasDocumentProcessorStatus(); }
  catch (error) {
    if (!(error instanceof BusinessRuleViolationError)) throw error;
    return <BackofficeShell title="Procesador de comprobantes" current="finance" {...shell}><Surface><p role="alert">{error.message}</p></Surface></BackofficeShell>;
  }
  let filters: DocumentJobFilters | null = null;
  let jobs: DocumentJobsPage | null = null;
  let queueError: string | null = null;
  try {
    filters = parseDocumentJobFilters({
      query: params.q ?? "", kind: params.kind ?? "all", status: params.status ?? "attention",
      page: params.page === undefined ? 1 : Number(params.page), pageSize: 20,
    });
    jobs = await listSaasDocumentJobs(filters, deps.billingPayments);
  } catch (error) {
    if (error instanceof ValidationError) queueError = error.issues.map((issue) => issue.message).join(" ");
    else if (error instanceof BusinessRuleViolationError) queueError = error.message;
    else throw error;
  }
  const stale = !status.last_worker_at || new Date().getTime() - Date.parse(status.last_worker_at) > 30 * 60 * 1000;
  return <BackofficeShell title="Procesador de comprobantes" description="Generación PDF y entrega por correo" current="finance" {...shell}>
    <div className="grid gap-5">
      <Surface><h2 className="font-bold">Configuración y actividad</h2><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        {[["Procesador",config.enabled ? "Habilitado" : "Desactivado"],["Secreto de scheduler",config.workerConfigured ? "Configurado (no confirma despliegue)" : "No configurado"],
          ["Resend y remitente",config.mailConfigured ? "Configurados (requiere dominio verificado)" : "Pendientes"],
          ["Última consulta real del worker",status.last_worker_at ?? "Sin ejecuciones registradas"],
          ["Trabajos en cola",String(status.queued)],["Fallos",String(status.failed)],["Resultados inciertos",String(status.unknown)]].map(([label,value]) =>
          <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-semibold">{value}</dd></div>)}
      </dl>{stale ? <p role="alert" className="mt-4 rounded-lg border border-warning/30 p-3 text-sm">No hay actividad del worker en los últimos 30 minutos. Tener variables configuradas no garantiza que el scheduler esté desplegado.</p> : null}</Surface>
      <Surface><h2 className="font-bold">Recuperación</h2><p className="mt-2 text-sm text-muted-foreground">Los PDFs reintentan con espera creciente y un máximo de cinco intentos. Un lease vencido permite recuperar la generación sin crear otro pago o folio.</p>
        <p className="mt-2 text-sm text-muted-foreground">El correo con timeout o lease vencido queda incierto: no se reenvía automáticamente. Concílialo con el proveedor antes de permitir un nuevo envío.</p>
        <Link href="/backoffice/collections" className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold">Revisar cobros y comprobantes</Link></Surface>
      <DocumentJobList result={jobs} filters={filters} params={params} error={queueError} />
    </div>
  </BackofficeShell>;
}
