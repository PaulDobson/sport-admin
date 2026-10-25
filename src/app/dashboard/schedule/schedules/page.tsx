import { redirect } from "next/navigation";
import { createInstructorSchedulingDeps } from "@/infrastructure/composition/instructor-scheduling-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { ScheduleNavigation } from "@/presentation/components/schedule-navigation";
import { SchedulesWorkspace } from "../schedules-workspace";

export default async function SchedulesPage() {
  const membership = await requireOperationalMembership();
  if (membership.role === "assistant") redirect("/dashboard/schedule");

  const deps = await createInstructorSchedulingDeps();
  const [templates, schedules, locations, disciplines] = await Promise.all([
    deps.classes.list(membership.tenantId),
    deps.catalog.listActiveSchedules(membership.tenantId),
    deps.catalog.listActiveLocations(membership.tenantId),
    deps.catalog.listActiveDisciplines(membership.tenantId),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <ScheduleNavigation
        role={membership.role}
        activeSection="schedules"
        compact
      />
      <SchedulesWorkspace
        classes={templates}
        disciplines={disciplines}
        templates={templates}
        schedules={schedules}
        locations={locations}
        instructorMembershipId={membership.id}
        canManageOtherInstructors={
          membership.role === "owner" || membership.role === "admin"
        }
      />
    </div>
  );
}
