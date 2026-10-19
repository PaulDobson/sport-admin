import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { listSaasPlanVersions } from "@/application/saas-administration/use-cases/manage-plan-catalog";
import type { SaasPlanVersion, SaasPlanVersionHistory } from "@/domain/saas-administration/plan-catalog";
import { BusinessRuleViolationError, NotFoundError, ValidationError } from "@/domain/shared/errors";
import { formatMoney } from "@/lib/format-money";
import { formatSaasFeature } from "@/lib/format-saas-feature";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { StatusBadge, Surface } from "@/presentation/components/primitives";
import { loadBackofficeContext } from "../../_lib/backoffice-context";

const dateTime = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago",
});
const linkClass = "inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold";

function VersionDetails({ version }: { version: SaasPlanVersion }) {
  return <div className="grid min-w-0 gap-3 text-sm">
    {version.description ? <p className="whitespace-pre-line break-words text-muted-foreground">{version.description}</p> : null}
    <p>Funciones: {version.features.map(formatSaasFeature).join(", ") || "Sin funciones adicionales"}</p>
    {version.services.length ? <div><p className="font-semibold">Servicios incluidos</p>
      <ul className="mt-1 list-inside list-disc space-y-1">{version.services.map((service, index) =>
        <li key={index} className="break-words">{service}</li>)}</ul>
    </div> : <p className="text-muted-foreground">Sin servicios descriptivos registrados.</p>}
    <p className="text-xs text-muted-foreground">{version.legacy
      ? "Condiciones históricas importadas. Se conservan precio y moneda originales sin conversión."
      : "Precio final en CLP con IVA informativo del 19% incluido."}</p>
  </div>;
}

function VersionBadge({ version, currentVersionId }: { version: SaasPlanVersion; currentVersionId: string | null }) {
  return <StatusBadge tone={version.id === currentVersionId ? "success" : "neutral"}>
    {version.id === currentVersionId ? "Vigente en catálogo" : "No vigente en catálogo"}
  </StatusBadge>;
}

function duration(version: SaasPlanVersion) {
  return `${version.durationCount} ${version.durationUnit === "months" ? "mes(es)" : "día(s)"}`;
}

export default async function PlanVersionHistoryPage({ params, searchParams }: {
  params: Promise<{ planId: string }>; searchParams: Promise<{ page?: string }>;
}) {
  const [{ deps, shell }, { planId }, search] = await Promise.all([loadBackofficeContext(), params, searchParams]);
  if (!z.uuid().safeParse(planId).success) notFound();
  let history: SaasPlanVersionHistory | null = null;
  let errorMessage: string | null = null;
  try {
    history = await listSaasPlanVersions({
      planId, page: search.page === undefined ? 1 : Number(search.page), pageSize: 20,
    }, deps.planCatalog);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ValidationError) errorMessage = error.issues.map((issue) => issue.message).join(" ");
    else if (error instanceof BusinessRuleViolationError) errorMessage = error.message;
    else throw error;
  }
  return <BackofficeShell title="Historial del plan" description="Versiones inmutables de las condiciones comerciales" current="plans" {...shell}>
    <div className="grid min-w-0 gap-5">
      <div className="flex flex-wrap gap-3">
        <Link href="/backoffice/plans" className={linkClass}>Volver al catálogo</Link>
        {history?.status === "active" ? <Link href={`/backoffice/plans?edit=${history.planId}`} className={linkClass}>Publicar nueva versión</Link> : null}
      </div>
      {errorMessage ? <Surface><p role="alert" className="text-sm text-destructive">{errorMessage}</p></Surface> : null}
      {history ? <>
        <Surface>
          <h2 className="break-words text-lg font-bold">{history.slug}</h2>
          <p className="mt-2 text-sm">Plan {history.status === "active" ? "activo" : "archivado"} · {history.total} versiones registradas.</p>
          <p className="mt-2 text-sm text-muted-foreground">El catálogo vigente no reemplaza las condiciones de los contratos existentes. Esta consulta no cambia suscripciones, cobros, límites ni comprobantes.</p>
          {history.status === "archived" ? <p className="mt-2 text-sm text-muted-foreground">Archivar impide nuevas asignaciones, pero conserva las versiones contratadas y su historial.</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">Fechas en Chile · Consulta: {dateTime.format(new Date(history.queriedAt))}.</p>
        </Surface>
        {!history.versions.length ? <Surface><h2 className="font-semibold">Sin versiones en esta página</h2>
          <p className="mt-2 text-sm text-muted-foreground">Revisa la paginación o vuelve al inicio del historial.</p>
          <Link href={`/backoffice/plans/${planId}`} className={`${linkClass} mt-3`}>Primera página</Link>
        </Surface> : <>
          <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:hidden">
            {history.versions.map((version) => <Surface key={version.id} className="grid min-w-0 gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">Versión {version.versionNumber}</h3>
                <VersionBadge version={version} currentVersionId={history.currentVersionId} />
              </div>
              <p className="break-words font-semibold">{version.name}</p>
              <p className="text-2xl font-bold tabular-nums">{formatMoney(version.price, version.currency)}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Duración</dt><dd>{duration(version)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Prueba disponible</dt><dd>{version.trialDays} días</dd></div>
                <div><dt className="text-xs text-muted-foreground">Alumnos</dt><dd>{version.maxStudents}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Usuarios</dt><dd>{version.maxUsers}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-muted-foreground">Registrada</dt><dd>{dateTime.format(new Date(version.createdAt))}</dd></div>
              </dl>
              <VersionDetails version={version} />
            </Surface>)}
          </div>
          <Surface className="hidden min-w-0 lg:block"><div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Historial de condiciones comerciales del plan</caption>
              <thead className="border-b border-border text-xs text-muted-foreground"><tr>
                {["Versión / condiciones", "Precio", "Duración / prueba", "Límites", "Registro (Chile)"].map((label) =>
                  <th key={label} scope="col" className="p-3">{label}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-border">{history.versions.map((version) => <tr key={version.id} className="align-top">
                <th scope="row" className="max-w-md p-3 font-normal">
                  <p className="break-words font-semibold">Versión {version.versionNumber} · {version.name}</p>
                  <div className="mt-2"><VersionBadge version={version} currentVersionId={history.currentVersionId} /></div>
                  <details className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center font-semibold">Ver condiciones guardadas</summary>
                    <VersionDetails version={version} /></details>
                </th>
                <td className="whitespace-nowrap p-3 font-semibold tabular-nums">{formatMoney(version.price, version.currency)}</td>
                <td className="p-3"><p>{duration(version)}</p><p className="mt-1 text-xs text-muted-foreground">{version.trialDays} días de prueba</p></td>
                <td className="p-3"><p>{version.maxStudents} alumnos</p><p>{version.maxUsers} usuarios</p></td>
                <td className="p-3">{dateTime.format(new Date(version.createdAt))}</td>
              </tr>)}</tbody>
            </table>
          </div></Surface>
        </>}
        <nav aria-label="Paginación de versiones" className="flex flex-wrap items-center justify-between gap-3 pb-24 text-sm lg:pb-0">
          {history.page > 1 ? <Link href={`/backoffice/plans/${planId}?page=${history.page - 1}`} className={linkClass}>Anterior</Link> : <span />}
          <span>Página {history.page} de {Math.max(1, Math.ceil(history.total / history.pageSize))}</span>
          {history.page * history.pageSize < history.total ? <Link href={`/backoffice/plans/${planId}?page=${history.page + 1}`} className={linkClass}>Siguiente</Link> : <span />}
        </nav>
      </> : null}
    </div>
  </BackofficeShell>;
}
