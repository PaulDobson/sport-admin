import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createInstructorSchedulingDeps } from "@/infrastructure/composition/instructor-scheduling-composition";
import { LocationsWorkspace } from "./locations-workspace";

export default async function LocationsPage() {
  const membership = await requireOperationalMembership();

  const deps = await createInstructorSchedulingDeps();
  const locations = await deps.catalog.listActiveLocations(membership.tenantId);

  return (
    <div className="mx-auto max-w-5xl">
      <LocationsWorkspace locations={locations} />
    </div>
  );
}
