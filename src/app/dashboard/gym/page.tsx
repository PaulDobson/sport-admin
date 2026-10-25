import { redirect } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { getTenantDetails } from "@/application/tenants/manage-tenant-details";
import { canManageTenantDetails } from "@/domain/tenants/tenant-details";
import { createTenantDetailsDeps } from "@/infrastructure/composition/tenant-details-composition";
import { GymForm } from "./gym-form";
import { Surface } from "@/presentation/components/primitives";

export default async function GymPage() {
  const membership = await requireOperationalMembership();
  if (!canManageTenantDetails(membership.role)) redirect("/dashboard");
  const details = await getTenantDetails(
    membership,
    await createTenantDetailsDeps(),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Surface className="relative overflow-hidden border-primary/15 bg-linear-to-br from-primary/10 via-card to-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Building2 aria-hidden="true" className="h-4 w-4" /> Datos del
              gimnasio
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Mi Gimnasio
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Mantén al día la información de tu academia y su contacto
              principal. Estos datos pertenecen al gimnasio, no a tu perfil
              personal.
            </p>
          </div>
        </div>
      </Surface>

      <GymForm key={details.tenantId} details={details} />
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Solo el dueño y los administradores pueden consultar y editar esta
          información. El contacto de facturación y las direcciones de las sedes
          se administran por separado.
        </span>
      </p>
    </div>
  );
}
