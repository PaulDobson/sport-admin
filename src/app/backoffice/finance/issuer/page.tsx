import { randomUUID } from "node:crypto";
import Link from "next/link";
import { getSaasBillingIssuer } from "@/application/saas-administration/use-cases/manage-billing-issuer";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { Surface } from "@/presentation/components/primitives";
import { loadBackofficeContext } from "../../_lib/backoffice-context";
import { IssuerForm } from "./issuer-form";

export default async function BillingIssuerPage() {
  const { deps, shell } = await loadBackofficeContext();
  let issuer;
  try { issuer = await getSaasBillingIssuer(deps.billingIssuer); }
  catch (error) {
    if (!(error instanceof BusinessRuleViolationError)) throw error;
    return <BackofficeShell title="Emisor de comprobantes" current="finance" {...shell}><Surface><p role="alert" className="text-sm text-destructive">{error.message}</p></Surface></BackofficeShell>;
  }
  return <BackofficeShell title="Emisor de comprobantes" description="Configuración financiera de la plataforma" current="finance" {...shell}>
    <div className="mx-auto grid max-w-3xl gap-5">
      <Link href="/backoffice/collections" className="inline-flex min-h-11 w-fit items-center rounded-lg border border-border px-3 text-sm font-semibold">Volver a cobranza</Link>
      <Surface><h2 className="text-lg font-bold">{issuer ? `Emisor vigente · versión ${issuer.versionNumber}` : "Configurar emisor"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Datos de quien presta el servicio SaaS a los gimnasios, no del contacto del tenant. Cada cambio crea una versión inmutable.</p>
        {!issuer ? <p role="status" className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">Sin emisor configurado. Debe estar completo antes de habilitar pagos con comprobante.</p> : null}
        <IssuerForm key={issuer?.id ?? "new"} issuer={issuer} operationId={randomUUID()} />
      </Surface>
      <Surface><h2 className="font-bold">Comprobante referencial — sin validez tributaria</h2><p className="mt-2 text-sm text-muted-foreground">Los nuevos comprobantes usan pesos CLP e IVA informativo del 19% incluido. No son boletas electrónicas autorizadas por el SII.</p>
        <p className="mt-2 text-sm text-muted-foreground">Guardar el emisor no envía mensajes ni acredita que los procesadores estén desplegados.</p>
        <Link href="/backoffice/finance/documents" className="mt-3 inline-flex min-h-11 items-center text-sm underline">Revisar disponibilidad de PDF y correo</Link></Surface>
    </div>
  </BackofficeShell>;
}
