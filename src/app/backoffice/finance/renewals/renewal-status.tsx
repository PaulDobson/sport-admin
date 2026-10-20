import Link from "next/link";
import { Activity } from "lucide-react";
import type { RenewalProcessorStatus } from "@/domain/saas-administration/renewal-processing";
import { Surface } from "@/presentation/components/primitives";

const formatter = new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" });
export function RenewalStatus({ status, configuration, error, now }: {
  status: RenewalProcessorStatus | null; configuration: { enabled: boolean; schedulerConfigured: boolean };
  error: string | null; now: string;
}) {
  const stale = !status?.lastWorkerRunAt || new Date(now).getTime() - new Date(status.lastWorkerRunAt).getTime() > 30 * 60 * 1000;
  return <Surface>
    <h2 className="flex items-center gap-2 text-lg font-bold"><Activity aria-hidden className="h-4 w-4 shrink-0" />Procesador de renovaciones</h2>
    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-muted-foreground">Habilitación</dt><dd>{configuration.enabled ? "Habilitado en este servidor" : "Desactivado: no procesa renovaciones"}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Secreto del scheduler</dt><dd>{configuration.schedulerConfigured ? "Configurado; no certifica despliegue" : "Sin configurar"}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Última solicitud del worker</dt><dd>{status?.lastWorkerRunAt ? formatter.format(new Date(status.lastWorkerRunAt)) : "Sin ejecución registrada"}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Suscripciones por renovar</dt><dd>{status ? status.dueCount : "Consulta no disponible"}</dd></div>
    </dl>
    {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
    {configuration.enabled && stale ? <p role="alert" className="mt-3 text-sm text-destructive">No hay actividad reciente del worker (30 minutos). Verifica el scheduler; esta pantalla no ejecuta renovaciones al abrirse.</p> : null}
    <p className="mt-3 text-xs text-muted-foreground">Cada solicitud automática procesa hasta 10 períodos. Los fallos reintentan cada 5 minutos, hasta 3 intentos; después requieren revisión manual. Un período fallido no impide procesar otros contratos.</p>
    {status?.failures.length ? <section className="mt-4 grid gap-3" aria-label="Renovaciones con error">
      <h3 className="font-semibold">Requieren revisión</h3>
      {status.failures.map((f) => <article key={f.subscriptionId} className="grid gap-1 rounded-xl border border-destructive/30 p-3 text-sm">
        <Link className="inline-flex min-h-11 items-center break-words font-semibold underline" href={`/backoffice/tenants/${f.tenantId}/subscription`}>{f.tenantName}</Link>
        <p>Período desde {f.periodStartsOn} · intento {f.attemptCount}/3 · código {f.errorCode}</p>
        <p className="text-xs text-muted-foreground">{f.nextAttemptAt ? `Próximo intento: ${formatter.format(new Date(f.nextAttemptAt))}` : "Reintentos automáticos agotados. Concilia el contrato y revisa una renovación manual."}</p>
      </article>)}
    </section> : null}
    {status?.blockedChanges.length ? <section className="mt-4 grid gap-3" aria-label="Avisos de cambios bloqueados">
      <h3 className="font-semibold">Cambios bloqueados al renovar</h3>
      {status.blockedChanges.map((c) => <article key={c.id} className="grid gap-1 rounded-xl border border-border p-3 text-sm">
        <Link className="inline-flex min-h-11 items-center break-words font-semibold underline" href={`/backoffice/tenants/${c.tenantId}/subscription`}>{c.tenantName}</Link>
        <p>{c.effectiveOn} · {c.blockedReason}</p>
        <p className="text-xs text-muted-foreground">El dueño recibe un aviso interno; se conserva el historial del cambio y no se eliminan recursos.</p>
      </article>)}
    </section> : null}
    {status && (status.failures.length === 50 || status.blockedChanges.length === 50) ? <p className="mt-3 text-xs text-muted-foreground">Se muestran hasta 50 registros por sección. Revisa también cada tenant.</p> : null}
  </Surface>;
}
