import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createInstructorSchedulingDeps } from "@/infrastructure/composition/instructor-scheduling-composition";
import { LocationsWorkspace } from "./locations-workspace";

export default async function LocationsPage() {
  const membership = await requireOperationalMembership();

  const deps = await createInstructorSchedulingDeps();
  const locations = await deps.catalog.listActiveLocations(
    membership.tenantId,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Ubicaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra los lugares donde impartes tus clases. Reutiliza un lugar
          en todas las clases que lo necesiten.
        </p>
      </div>
      <LocationsWorkspace locations={locations} />
    </div>
  );
}
