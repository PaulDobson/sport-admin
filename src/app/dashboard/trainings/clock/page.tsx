import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createTenantDetailsDeps } from "@/infrastructure/composition/tenant-details-composition";
import { ClockDisplay } from "./_components/clock-display";

export default async function ClockPage() {
  const membership = await requireOperationalMembership();
  const repo = await createTenantDetailsDeps();
  const details = await repo.findByTenantId(membership.tenantId);

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <ClockDisplay gymName={details?.name ?? ""} />
    </div>
  );
}
