"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CalendarPlus, Dumbbell, MapPin, Repeat2, Tags } from "lucide-react";
import type {
  ClassScheduleOption,
  ClassTemplateOption,
  DisciplineOption,
} from "@/application/instructor-operations/ports/schedule-catalog-port";
import type { ClassTemplateAdministrationRow } from "@/application/instructor-operations/ports/class-template-administration-port";
import { Surface } from "@/presentation/components/primitives";
import { ClassTemplateAdministrationWorkspace } from "./class-template-administration-workspace";
import {
  CatalogCreationPanel,
  ClassCreationForm,
  DisciplineCreationForm,
  ProgrammingFeedback,
} from "./programming-catalog-forms";
import { programmingDays } from "./programming-time";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeCreated<T extends { id: string }>(catalog: T[], created: T[]) {
  if (created.length === 0) return catalog;
  const existingIds = new Set(catalog.map((item) => item.id));
  const novel = created.filter((item) => !existingIds.has(item.id));
  return novel.length === 0 ? catalog : [...catalog, ...novel];
}

export function groupProgrammingSchedules(schedules: ClassScheduleOption[]) {
  const groups = new Map<string, ClassScheduleOption[]>();
  for (const schedule of schedules) {
    const key = JSON.stringify([
      schedule.classTemplateId,
      schedule.locationId,
      schedule.instructorMembershipId,
      schedule.timezone,
    ]);
    const group = groups.get(key);
    if (group) group.push(schedule);
    else groups.set(key, [schedule]);
  }
  return [...groups.values()].map((items) =>
    items.toSorted(
      (a, b) =>
        ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7) ||
        a.startsAt.localeCompare(b.startsAt),
    ),
  );
}

function timeRange(schedule: ClassScheduleOption) {
  return `${schedule.startsAt.slice(0, 5)}–${schedule.endsAt.slice(0, 5)}`;
}

// ---------------------------------------------------------------------------
// Tab state via URL hash
// ---------------------------------------------------------------------------

type Section = "schedules" | "classes";

const sections: ReadonlyArray<{
  value: Section;
  label: string;
  hash: string;
  icon: typeof Repeat2;
}> = [
  { value: "schedules", label: "Horarios", hash: "#horarios", icon: Repeat2 },
  { value: "classes", label: "Clases", hash: "#clases", icon: Dumbbell },
];

function sectionForHash(hash: string): Section {
  if (hash === "#clases" || hash === "#class-setup") return "classes";
  return "schedules";
}

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

// ---------------------------------------------------------------------------
// Weekly routine card
// ---------------------------------------------------------------------------

function WeeklyRoutineCard({
  group,
  canProgram,
}: {
  group: ClassScheduleOption[];
  canProgram: boolean;
}) {
  const first = group[0];
  const days = programmingDays.map((day) => ({
    ...day,
    items: group.filter((schedule) => schedule.dayOfWeek === day.value),
  }));
  const activeDays = days.filter((day) => day.items.length > 0);

  return (
    <Surface className="flex h-full min-w-0 flex-col gap-4 border-border/80 bg-surface-raised p-4">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-bold leading-tight wrap-anywhere">
            {first.classTemplateName}
          </h3>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="wrap-anywhere">{first.locationName}</span>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/25">
          {activeDays.length}d · {group.length}h
        </span>
      </header>

      {/* Mobile: stacked day list */}
      <ul className="space-y-1.5 md:hidden">
        {activeDays.map((day) => (
          <li
            key={day.value}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted px-3 py-2 text-sm"
          >
            <span className="font-semibold">{day.name}</span>
            <span className="flex flex-wrap justify-end gap-1.5 tabular-nums text-muted-foreground">
              {day.items.map((s) => (
                <span key={s.id}>{timeRange(s)}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>

      {/* Desktop: 7-day grid */}
      <ol
        aria-label={`Semana de ${first.classTemplateName}`}
        className="hidden grid-cols-7 gap-1 md:grid"
      >
        {days.map((day) => (
          <li
            key={day.value}
            className={[
              "flex min-h-20 min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center",
              day.items.length
                ? "border-primary/40 bg-primary/10"
                : "border-dashed border-border",
            ].join(" ")}
          >
            <span className="sr-only">
              {day.items.length
                ? `${day.name}: ${day.items.map(timeRange).join(", ")}`
                : `${day.name}: sin clase`}
            </span>
            <span
              aria-hidden="true"
              className={`text-xs font-bold uppercase tracking-wide ${day.items.length ? "text-primary" : "text-muted-foreground"}`}
            >
              {day.short}
            </span>
            {day.items.length ? (
              day.items.map((s) => (
                <span
                  key={s.id}
                  aria-hidden="true"
                  className="flex flex-col text-xs leading-tight tabular-nums"
                >
                  <span className="font-semibold text-foreground">
                    {s.startsAt.slice(0, 5)}
                  </span>
                  <span className="text-muted-foreground">
                    {s.endsAt.slice(0, 5)}
                  </span>
                </span>
              ))
            ) : (
              <span
                aria-hidden="true"
                className="text-xs text-muted-foreground"
              >
                —
              </span>
            )}
          </li>
        ))}
      </ol>

      <p className="text-xs text-muted-foreground">
        {first.timezone.replaceAll("_", " ")}
      </p>

      {/* Footer */}
      <footer className="mt-auto flex flex-col gap-2 border-t border-white/8 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {canProgram ? (
          <Link
            href={`/dashboard/schedule/programming#programar`}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <CalendarPlus aria-hidden="true" className="h-4 w-4" />
            Reprogramar
          </Link>
        ) : (
          <p className="text-xs text-muted-foreground">
            Rutina de otro instructor
          </p>
        )}
        <Link
          href={`/dashboard/schedule?location=${first.locationId}`}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Ver sesiones
        </Link>
      </footer>
    </Surface>
  );
}

// ---------------------------------------------------------------------------
// Main workspace
// ---------------------------------------------------------------------------

export function SchedulesWorkspace({
  classes,
  disciplines,
  templates,
  schedules,
  instructorMembershipId,
  canManageOtherInstructors = false,
}: {
  classes: ClassTemplateAdministrationRow[];
  disciplines: DisciplineOption[];
  templates: ClassTemplateOption[];
  schedules: ClassScheduleOption[];
  instructorMembershipId?: string;
  canManageOtherInstructors?: boolean;
}) {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );
  const activeSection = sectionForHash(hash);

  const [createdDisciplines, setCreatedDisciplines] = useState<
    DisciplineOption[]
  >([]);
  const [createdClasses, setCreatedClasses] = useState<ClassTemplateOption[]>(
    [],
  );
  const [classCreationOpen, setClassCreationOpen] = useState(
    templates.length === 0,
  );

  const allDisciplines = mergeCreated(disciplines, createdDisciplines);
  const allClasses = mergeCreated(
    classes,
    createdClasses.map((item) => ({
      ...item,
      scheduleCount: 0,
      sessionCount: 0,
    })),
  );

  const onDisciplineCreated = useCallback(
    (value: DisciplineOption) =>
      setCreatedDisciplines((c) => mergeCreated(c, [value])),
    [],
  );
  const onClassCreated = useCallback(
    (value: ClassTemplateOption) =>
      setCreatedClasses((c) => mergeCreated(c, [value])),
    [],
  );

  const groupedSchedules = groupProgrammingSchedules(schedules);

  const [pendingHash, setPendingHash] = useState<string | null>(null);

  useEffect(() => {
    if (pendingHash !== null) {
      window.location.hash = pendingHash;
      setTimeout(() => setPendingHash(null), 0);
    }
  }, [pendingHash]);

  function setSection(value: Section) {
    const section = sections.find((s) => s.value === value);
    if (section) setPendingHash(section.hash);
  }

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div
        role="tablist"
        aria-label="Secciones de programación"
        className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-muted p-1.5"
      >
        {sections.map(({ value, label, icon: Icon }) => {
          const active = activeSection === value;
          return (
            <button
              key={value}
              role="tab"
              aria-selected={active}
              onClick={() => setSection(value)}
              className={[
                "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-semibold transition-colors sm:min-h-11 sm:flex-row sm:gap-2 sm:text-sm",
                active
                  ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
              ].join(" ")}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel: Horarios */}
      {activeSection === "schedules" ? (
        <div className="space-y-4" role="tabpanel" aria-label="Horarios">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {groupedSchedules.length === 0
                ? "Sin horarios semanales activos."
                : `${groupedSchedules.length} rutina${groupedSchedules.length !== 1 ? "s" : ""} activa${groupedSchedules.length !== 1 ? "s" : ""}`}
            </p>
            <Link
              href="/dashboard/schedule/programming"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <CalendarPlus aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva clase</span>
              <span className="sm:hidden">Nueva</span>
            </Link>
          </div>

          {groupedSchedules.length === 0 ? (
            <Surface className="py-10 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Repeat2 aria-hidden="true" className="h-6 w-6" />
              </div>
              <p className="font-semibold">Sin horarios semanales</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Programa tu primera clase recurrente para verla aquí.
              </p>
              <Link
                href="/dashboard/schedule/programming"
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <CalendarPlus aria-hidden="true" className="h-4 w-4" />
                Programar una clase
              </Link>
            </Surface>
          ) : (
            <ul
              aria-label="Rutinas semanales"
              className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3"
            >
              {groupedSchedules.map((group) => (
                <li key={group[0].id} className="min-w-0">
                  <WeeklyRoutineCard
                    group={group}
                    canProgram={
                      !instructorMembershipId ||
                      instructorMembershipId ===
                        group[0].instructorMembershipId ||
                      canManageOtherInstructors
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* Panel: Clases */}
      {activeSection === "classes" ? (
        <div className="space-y-4" role="tabpanel" aria-label="Clases">
          <Surface className="space-y-4 border-border/80 bg-surface-raised p-4 sm:p-5">
            <div>
              <h2 className="text-base font-bold">Catálogo de clases</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Las disciplinas agrupan tus clases. Las clases definen grupos y
                cupos.
              </p>
            </div>
            <CatalogCreationPanel
              title="Nueva disciplina"
              description="Agrupa tus clases por actividad: boxeo, yoga, pilates…"
              icon={Tags}
            >
              <DisciplineCreationForm onCreated={onDisciplineCreated} />
            </CatalogCreationPanel>
            <CatalogCreationPanel
              title="Nueva clase"
              description="Define el grupo y sus cupos; luego asígnale horarios."
              icon={Dumbbell}
              open={classCreationOpen || templates.length === 0}
              onToggle={(e) => setClassCreationOpen(e.currentTarget.open)}
            >
              <div id="class-template-setup">
                <ClassCreationForm
                  disciplines={allDisciplines}
                  onCreated={onClassCreated}
                />
              </div>
            </CatalogCreationPanel>
            <Link
              href="/dashboard/disciplines"
              className="inline-flex min-h-10 items-center text-sm font-semibold text-primary underline underline-offset-4"
            >
              Administrar disciplinas
            </Link>
          </Surface>
          <ClassTemplateAdministrationWorkspace classes={allClasses} />
        </div>
      ) : null}
    </div>
  );
}
