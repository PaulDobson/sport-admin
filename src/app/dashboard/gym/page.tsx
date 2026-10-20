import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { getTenantDetails } from "@/application/tenants/manage-tenant-details";
import { canManageTenantDetails } from "@/domain/tenants/tenant-details";
import { createTenantDetailsDeps } from "@/infrastructure/composition/tenant-details-composition";
import { GymForm } from "./gym-form";

export default async function GymPage() {
  const membership = await requireOperationalMembership();
  if (!canManageTenantDetails(membership.role)) redirect("/dashboard");
  const details = await getTenantDetails(membership, await createTenantDetailsDeps());

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Datos del gimnasio</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Mantén al día la información de tu academia y su contacto principal.
          Estos datos pertenecen al gimnasio, no a tu perfil personal.
        </p>
      </div>
      <GymForm key={details.tenantId} details={details} />
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Solo el dueño y los administradores pueden consultar y editar esta información.
        El contacto de facturación y las direcciones de las sedes se administran por separado.
        </span>
      </p>
    </div>
  );
}
