import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { getTenantDetails } from "@/application/tenants/manage-tenant-details";
import { createTenantDetailsDeps } from "@/infrastructure/composition/tenant-details-composition";
import { ClockDisplay } from "./_components/clock-display";

export default async function ClockPage() {
  const membership = await requireOperationalMembership();
  const details = await getTenantDetails(
    membership,
    await createTenantDetailsDeps(),
  );

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <ClockDisplay gymName={details.name} />
    </div>
  );
}
