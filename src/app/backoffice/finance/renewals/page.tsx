import Link from "next/link";
import { getSaasRenewalStatus } from "@/application/saas-administration/use-cases/process-subscription-renewals";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { getSaasRenewalConfiguration } from "@/infrastructure/composition/saas-renewal-composition";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { loadBackofficeContext } from "../../_lib/backoffice-context";
import { RenewalStatus } from "./renewal-status";

export default async function RenewalProcessorPage() {
  const { deps, shell } = await loadBackofficeContext();
  const configuration = getSaasRenewalConfiguration();
  let status = null;
  let error = null;
  try { status = await getSaasRenewalStatus(null, deps.renewals); }
  catch (cause) {
    if (!(cause instanceof BusinessRuleViolationError)) throw cause;
    error = cause.message;
  }
  return <BackofficeShell title="Renovaciones SaaS" description="Procesamiento, atrasos y cambios bloqueados" current="finance" {...shell}>
    <div className="mx-auto grid max-w-3xl gap-4">
      <Link href="/backoffice/finance" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground">Volver a Finanzas</Link>
      <RenewalStatus status={status} configuration={configuration} error={error} now={new Date().toISOString()} />
    </div>
  </BackofficeShell>;
}
