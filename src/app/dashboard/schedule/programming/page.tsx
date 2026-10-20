import { redirect } from "next/navigation";
import { Dumbbell, MapPin, Repeat2, CalendarDays } from "lucide-react";
import { requireOperationalMembership } from "@/app/_lib/operational-context";
import { createInstructorSchedulingDeps } from "@/infrastructure/composition/instructor-scheduling-composition";
import { Surface } from "@/presentation/components/primitives";
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
  const [templates, schedules, locations, disciplines] = await Promise.all([
    deps.classes.list(membership.tenantId),
    deps.catalog.listActiveSchedules(membership.tenantId),
    deps.catalog.listActiveLocations(membership.tenantId),
    deps.catalog.listActiveDisciplines(membership.tenantId),
  ]);
  const today = dateInTimezone(new Date(), defaultTimezone);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <ScheduleNavigation
        role={membership.role}
        activeSection="programming"
        compact
      />
      <Surface className="border-primary/30 bg-linear-to-br from-primary/20 via-primary/5 to-card p-5 sm:p-7">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            Agenda · Programación
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Programa tus clases
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Una clase puntual o tu rutina semanal, en un solo recorrido.
          </p>
        </div>
      </Surface>

      <section
        aria-label="Resumen de programación"
        className="grid grid-cols-3 gap-2"
      >
        {[
          {
            label: "Clases",
            value: templates.length,
            detail: "Grupos y cupos",
            icon: Dumbbell,
          },
          {
            label: "Horarios",
            value: schedules.length,
            detail: "Rutinas recurrentes activas",
            icon: Repeat2,
          },
          {
            label: "Ubicaciones",
            value: locations.length,
            detail: "Espacios para entrenar",
            icon: MapPin,
          },
        ].map(({ label, value, detail, icon: Icon }) => (
          <Surface
            key={label}
            className="flex min-w-0 items-center gap-2 border-border/80 bg-surface-raised p-2.5 sm:p-3"
          >
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25 sm:flex">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-1 sm:block">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <p className="metric-number mt-0.5 text-xl font-bold">{value}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {detail}
              </p>
            </div>
          </Surface>
        ))}
      </section>

      <ProgrammingWorkspace
        classes={templates}
        disciplines={disciplines}
        templates={templates}
        schedules={schedules}
        locations={locations}
        today={today}
        throughDate={addCalendarDays(today, 56)}
        instructorMembershipId={membership.id}
        canManageOtherInstructors={
          membership.role === "owner" || membership.role === "admin"
        }
      />
    </div>
  );
}
