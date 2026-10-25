import { redirect } from "next/navigation";
import { createInstructorSchedulingDeps } from "@/infrastructure/composition/instructor-scheduling-composition";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { ScheduleNavigation } from "@/presentation/components/schedule-navigation";
import { ProgrammingWorkspace } from "../programming-workspace";

const defaultTimezone = "America/Santiago";

function dateInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (part: string) =>
    parts.find((item) => item.type === part)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addCalendarDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function ScheduleProgrammingPage() {
  const membership = await requireOperationalMembership();
  if (membership.role === "assistant") redirect("/dashboard/schedule");

  const deps = await createInstructorSchedulingDeps();
  const [templates, locations, disciplines] = await Promise.all([
    deps.classes.list(membership.tenantId),
    deps.catalog.listActiveLocations(membership.tenantId),
    deps.catalog.listActiveDisciplines(membership.tenantId),
  ]);
  const today = dateInTimezone(new Date(), defaultTimezone);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <ScheduleNavigation
        role={membership.role}
        activeSection="programming"
        compact
      />
      <ProgrammingWorkspace
        disciplines={disciplines}
        templates={templates}
        locations={locations}
        today={today}
        throughDate={addCalendarDays(today, 56)}
      />
    </div>
  );
}
