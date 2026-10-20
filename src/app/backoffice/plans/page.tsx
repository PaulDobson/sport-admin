import { randomUUID } from "node:crypto";
import Link from "next/link";
import { Archive, Layers3, Plus } from "lucide-react";
import { listSaasPlanCatalog } from "@/application/saas-administration/use-cases/manage-plan-catalog";
import type { SaasCatalogPlan } from "@/domain/saas-administration/plan-catalog";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { formatMoney } from "@/lib/format-money";
import { formatSaasFeature } from "@/lib/format-saas-feature";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { StatusBadge, Surface } from "@/presentation/components/primitives";
import { loadBackofficeContext } from "../_lib/backoffice-context";
import { ArchivePlanForm, PlanForm } from "./plan-form";

export default async function SaasPlansPage({
  searchParams,
}: { searchParams: Promise<{ new?: string; edit?: string; status?: string; q?: string }> }) {
  const [{ deps, shell }, params] = await Promise.all([loadBackofficeContext(), searchParams]);
  let plans: SaasCatalogPlan[];
  try {
    plans = await listSaasPlanCatalog(deps.planCatalog);
  } catch (error) {
    if (!(error instanceof BusinessRuleViolationError)) throw error;
    return (
      <BackofficeShell title="Planes" current="plans" {...shell}>
        <Surface><h2 className="font-semibold">Catálogo pendiente de configuración</h2><p role="alert" className="mt-2 text-sm text-destructive">{error.message}</p></Surface>
      </BackofficeShell>
    );
  }
  const selected = plans.find((p) => p.id === params.edit && p.status === "active");
  const status = ["active", "archived"].includes(params.status ?? "") ? params.status : "all";
  const query = (params.q ?? "").trim().toLocaleLowerCase("es");
  const filtered = plans.filter((p) => (status === "all" || p.status === status)
    && `${p.currentVersion.name} ${p.currentVersion.description ?? ""}`.toLocaleLowerCase("es").includes(query));
  return (
    <BackofficeShell title="Planes" description="Catálogo comercial · precios finales en CLP" current="plans" {...shell}>
      <div className="grid gap-5">
        {params.edit && !selected ? <p role="alert" className="text-sm text-destructive">El plan solicitado no existe o está archivado.</p> : null}
        {params.new === "1" || selected ? <PlanForm key={selected?.id ?? "new"} plan={selected} operationId={randomUUID()} /> : null}
        <Surface>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="flex items-center gap-2 text-lg font-bold"><Layers3 aria-hidden className="h-4 w-4 shrink-0" />Catálogo de planes</h2>
              <p className="mt-1 text-sm text-muted-foreground">Las versiones publicadas no modifican contratos vigentes.</p>
            </div>
            <Link href="/backoffice/plans?new=1" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
              <Plus aria-hidden className="h-4 w-4 shrink-0" />Crear plan
            </Link>
          </div>
          <form method="get" className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">Buscar plan<input name="q" defaultValue={params.q} type="search" className="h-11 min-w-0 rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground" /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">Estado<select name="status" defaultValue={status} className="h-11 rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground">
              <option value="all">Todos</option><option value="active">Activos</option><option value="archived">Archivados</option>
            </select></label>
            <button className="min-h-11 self-end rounded-lg border border-border px-4 text-sm font-semibold" type="submit">Filtrar</button>
          </form>
        </Surface>
        <p role="status" className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "plan" : "planes"}</p>
        {filtered.length === 0 ? <Surface><h2 className="font-semibold">{plans.length ? "Sin coincidencias" : "Aún no hay planes"}</h2><p className="mt-1 text-sm text-muted-foreground">{plans.length ? "Prueba otro nombre o estado." : "Crea la primera oferta comercial para tus gimnasios."}</p></Surface> : null}
        <div className="grid gap-4 md:grid-cols-2 lg:hidden">
          {filtered.map((p) => {
            const v = p.currentVersion;
            return <Surface key={p.id} className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge tone={p.status === "active" ? "success" : "neutral"}>{p.status === "active" ? "Activo" : "Archivado"}</StatusBadge><span className="text-xs text-muted-foreground">Versión {v.versionNumber}</span></div>
              <div><h3 className="break-words text-lg font-bold">{v.name}</h3>{v.description ? <p className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground">{v.description}</p> : null}</div>
              <div><p className="text-2xl font-bold tabular-nums">{formatMoney(v.price, v.currency)}</p><p className="text-sm text-muted-foreground">Cada {v.durationCount} {v.durationUnit === "months" ? (v.durationCount === 1 ? "mes" : "meses") : (v.durationCount === 1 ? "día" : "días")}{v.currency === "CLP" && !v.legacy ? " · IVA 19% incluido" : " · histórico"}</p></div>
              <dl className="grid grid-cols-2 gap-3 rounded-lg bg-background/50 p-3 text-sm"><div><dt className="text-xs text-muted-foreground">Alumnos</dt><dd className="font-semibold">{v.maxStudents}</dd></div><div><dt className="text-xs text-muted-foreground">Usuarios</dt><dd className="font-semibold">{v.maxUsers}</dd></div><div className="col-span-2"><dt className="text-xs text-muted-foreground">Prueba disponible</dt><dd>{v.trialDays ? `${v.trialDays} días, opcional al asignar` : "Sin período de prueba"}</dd></div></dl>
              {v.services.length ? <ul className="list-inside list-disc space-y-1 text-sm">{v.services.map((service, i) => <li key={i} className="break-words">{service}</li>)}</ul> : null}
              <p className="text-xs text-muted-foreground">Funciones: {v.features.map(formatSaasFeature).join(", ") || "Sin funciones adicionales"}</p>
              <Link href={`/backoffice/plans/${p.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold">Ver historial de versiones</Link>
              {p.status === "active" ? <div className="mt-auto grid gap-3">
                <Link href={`/backoffice/plans?edit=${p.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold">Publicar nueva versión</Link>
                <details><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground"><Archive aria-hidden className="h-4 w-4 shrink-0" />Archivar plan</summary><ArchivePlanForm plan={p} operationId={randomUUID()} /></details>
              </div> : null}
            </Surface>;
          })}
        </div>
        {filtered.length ? <Surface className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Planes y condiciones comerciales vigentes en el catálogo</caption>
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr><th scope="col" className="p-3">Plan / versión</th><th scope="col" className="p-3">Precio final</th><th scope="col" className="p-3">Duración</th><th scope="col" className="p-3">Límites</th><th scope="col" className="p-3">Estado</th><th scope="col" className="p-3">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => {
                  const v = p.currentVersion;
                  return <tr key={p.id} className="align-top">
                    <th scope="row" className="max-w-xs p-3 font-normal"><p className="break-words font-semibold">{v.name}</p><p className="text-xs text-muted-foreground">Versión {v.versionNumber}</p>
                      <details className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center text-xs text-muted-foreground">Ver servicios y funciones</summary>
                        {v.description ? <p className="whitespace-pre-line break-words text-sm">{v.description}</p> : null}
                        <ul className="mt-2 list-inside list-disc">{v.services.map((s, i) => <li key={i} className="break-words font-normal">{s}</li>)}</ul>
                        <p className="mt-2 text-xs text-muted-foreground">Funciones: {v.features.map(formatSaasFeature).join(", ") || "Sin funciones adicionales"}</p>
                      </details>
                    </th>
                    <td className="p-3"><p className="whitespace-nowrap font-semibold tabular-nums">{formatMoney(v.price, v.currency)}</p><p className="text-xs text-muted-foreground">{v.currency === "CLP" && !v.legacy ? "IVA 19% incluido" : "Histórico sin conversión"}</p></td>
                    <td className="p-3">{v.durationCount} {v.durationUnit === "months" ? "mes(es)" : "día(s)"}<p className="mt-1 text-xs text-muted-foreground">{v.trialDays} días de prueba disponibles</p></td>
                    <td className="p-3"><p>{v.maxStudents} alumnos</p><p>{v.maxUsers} usuarios</p></td>
                    <td className="p-3"><StatusBadge tone={p.status === "active" ? "success" : "neutral"}>{p.status === "active" ? "Activo" : "Archivado"}</StatusBadge></td>
                    <td className="w-56 p-3"><Link href={`/backoffice/plans/${p.id}`} className="mb-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-xs font-semibold">Ver historial de versiones</Link>{p.status === "active" ? <div className="grid gap-2">
                      <Link href={`/backoffice/plans?edit=${p.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-xs font-semibold">Publicar nueva versión</Link>
                      <details><summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted-foreground"><Archive aria-hidden className="h-4 w-4 shrink-0" />Archivar plan</summary><ArchivePlanForm plan={p} operationId={randomUUID()} /></details>
                    </div> : <span className="text-xs text-muted-foreground">Conserva contratos existentes</span>}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </Surface> : null}
      </div>
    </BackofficeShell>
  );
}
