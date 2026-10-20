"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Tabs } from "@base-ui/react/tabs";
import Link from "next/link";
import { CalendarPlus, Dumbbell, MapPin, Repeat2, Tags } from "lucide-react";
import type {
  ClassScheduleOption,
  ClassTemplateOption,
  DisciplineOption,
} from "@/application/instructor-operations/ports/schedule-catalog-port";
import type { ClassTemplateAdministrationRow } from "@/application/instructor-operations/ports/class-template-administration-port";
import type { DayLocation } from "@/domain/instructor-operations/instructor-day";
import { Surface } from "@/presentation/components/primitives";
import { ClassTemplateAdministrationWorkspace } from "./class-template-administration-workspace";
import {
  CatalogCreationPanel,
  ClassCreationForm,
  DisciplineCreationForm,
  LocationCreationForm,
  ProgrammingButton as Button,
} from "./programming-catalog-forms";
import { ProgrammingWizard } from "./programming-wizard";
import { programmingDays } from "./programming-time";

const sections = [
  {
    value: "program",
    label: "Programar",
    hash: "#programar",
    icon: CalendarPlus,
  },
  {
    value: "schedules",
    label: "Horarios",
    hash: "#recurring-heading",
    icon: Repeat2,
  },
  { value: "classes", label: "Clases", hash: "#class-catalog", icon: Dumbbell },
  {
    value: "locations",
    label: "Ubicaciones",
    hash: "#location-setup",
    icon: MapPin,
  },
] as const;

function subscribeToHash(onChange: () => void) {
  // Listen only to hashchange — popstate fires on all history changes
  // (including push/replace) which would cause spurious re-renders when the
  // hash hasn't actually changed.
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
}

function sectionForHash(hash: string) {
  if (hash === "#one-off-heading") return "program";
  if (hash === "#class-setup" || hash === "#class-template-setup")
    return "classes";
  return sections.find((section) => section.hash === hash)?.value ?? "program";
}

function mergeCreated<T extends { id: string }>(catalog: T[], created: T[]) {
  if (created.length === 0) return catalog;
  // O(n) lookup via Set instead of O(n×m) with .some() inside .filter().
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

function WeeklyRoutineCard({
  group,
  canProgram,
  onProgram,
}: {
  group: ClassScheduleOption[];
  canProgram: boolean;
  onProgram: () => void;
}) {
  const first = group[0];
  const days = programmingDays.map((day) => ({
    ...day,
    items: group.filter((schedule) => schedule.dayOfWeek === day.value),
  }));
  const activeDays = days.filter((day) => day.items.length > 0);
  return (
    <Surface className="flex h-full min-w-0 flex-col gap-4 border-border/80 bg-surface-raised p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-lg font-bold leading-tight wrap-anywhere">
            {first.classTemplateName}
          </h3>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="wrap-anywhere">{first.locationName}</span>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/25">
          {activeDays.length} {activeDays.length === 1 ? "día" : "días"} ·{" "}
          {group.length} {group.length === 1 ? "horario" : "horarios"}
        </span>
      </header>

      <ul className="space-y-2 md:hidden">
        {activeDays.map((day) => (
          <li
            key={day.value}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted px-3 py-2.5 text-sm"
          >
            <span className="font-semibold">{day.name}</span>
            <span className="flex flex-wrap justify-end gap-1.5 tabular-nums">
              {day.items.map((schedule) => (
                <span key={schedule.id}>{timeRange(schedule)}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <ol
        aria-label={`Semana de ${first.classTemplateName}`}
        className="hidden grid-cols-7 gap-1.5 md:grid"
      >
        {days.map((day) => (
          <li
            key={day.value}
            className={`flex min-h-24 min-w-0 flex-col items-center gap-1.5 rounded-lg border px-1 py-2 text-center ${day.items.length ? "border-primary/40 bg-primary/10" : "border-dashed border-border"}`}
          >
            <span className="sr-only">
              {day.items.length
                ? `${day.name}: ${day.items.map(timeRange).join(", ")}`
                : `${day.name}: sin clase`}
            </span>
            <span
              aria-hidden="true"
              className={`text-xs font-semibold uppercase tracking-wide ${day.items.length ? "text-primary" : "text-muted-foreground"}`}
            >
              {day.short}
            </span>
            {day.items.length ? (
              day.items.map((schedule) => (
                <span
                  key={schedule.id}
                  aria-hidden="true"
                  className="flex flex-col text-xs leading-tight tabular-nums"
                >
                  <span className="font-semibold text-foreground">
                    {schedule.startsAt.slice(0, 5)}
                  </span>
                  <span className="text-muted-foreground">
                    {schedule.endsAt.slice(0, 5)}
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
        Zona horaria: {first.timezone.replaceAll("_", " ")}
      </p>

      <footer className="mt-auto flex flex-col gap-2 border-t border-white/8 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {canProgram ? (
          <Button variant="primary" onClick={onProgram}>
            Revisar y publicar esta rutina
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta rutina pertenece a otro instructor. Sus horarios se conservan;
            publica tus propias clases desde Programar.
          </p>
        )}
        <Link
          href={`/dashboard/schedule?location=${first.locationId}`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Ver sesiones de este lugar
        </Link>
      </footer>
    </Surface>
  );
}

export function ProgrammingWorkspace({
  classes,
  disciplines,
  templates,
  schedules,
  locations,
  today,
  throughDate,
  instructorMembershipId,
  canManageOtherInstructors = false,
}: {
  classes: ClassTemplateAdministrationRow[];
  disciplines: DisciplineOption[];
  templates: ClassTemplateOption[];
  schedules: ClassScheduleOption[];
  locations: DayLocation[];
  today: string;
  throughDate: string;
  instructorMembershipId?: string;
  canManageOtherInstructors?: boolean;
}) {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );
  const selectedSection = sectionForHash(hash);
  const [createdDisciplines, setCreatedDisciplines] = useState<
    DisciplineOption[]
  >([]);
  const [createdClasses, setCreatedClasses] = useState<ClassTemplateOption[]>(
    [],
  );
  const [createdLocations, setCreatedLocations] = useState<DayLocation[]>([]);
  const [creationOpen, setCreationOpen] = useState(templates.length === 0);
  const [wizardKey, setWizardKey] = useState(0);
  const [preset, setPreset] =
    useState<Parameters<typeof ProgrammingWizard>[0]["preset"]>();
  const [dirty, setDirty] = useState(false);
  const allDisciplines = mergeCreated(disciplines, createdDisciplines);
  const allTemplates = mergeCreated(templates, createdClasses);
  const allLocations = mergeCreated(locations, createdLocations);
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
      setCreatedDisciplines((current) => mergeCreated(current, [value])),
    [],
  );
  const onClassCreated = useCallback(
    (value: ClassTemplateOption) =>
      setCreatedClasses((current) => mergeCreated(current, [value])),
    [],
  );
  const onLocationCreated = useCallback(
    (value: DayLocation) =>
      setCreatedLocations((current) => mergeCreated(current, [value])),
    [],
  );
  const classCreationExpanded =
    creationOpen || hash === "#class-template-setup" || hash === "#class-setup";

  useEffect(() => {
    if (!hash) return;
    const frame = requestAnimationFrame(() =>
      document
        .getElementById("programming-actions")
        ?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  function programGroup(group: ClassScheduleOption[]) {
    if (
      dirty &&
      !window.confirm(
        "Tienes una programación sin terminar. ¿Reemplazarla por estos horarios?",
      )
    )
      return;
    const first = group[0];
    setPreset({
      classTemplateId: first.classTemplateId,
      locationId: first.locationId,
      timezone: first.timezone,
      instructorMembershipId: first.instructorMembershipId,
      slots: group.map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        startsAt: schedule.startsAt.slice(0, 5),
        endsAt: schedule.endsAt.slice(0, 5),
        locationId: schedule.locationId,
      })),
    });
    setWizardKey((current) => current + 1);
    window.history.pushState(null, "", "#programar");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  return (
    <Tabs.Root
      value={selectedSection}
      onValueChange={(value) => {
        const section = sections.find((item) => item.value === value);
        if (section) window.location.hash = section.hash;
      }}
      className="space-y-5"
    >
      <Tabs.List
        id="programming-actions"
        aria-label="Acciones de programación"
        className="grid scroll-mt-28 grid-cols-4 gap-1 rounded-xl border border-border bg-muted p-1.5"
      >
        {sections.map(({ value, label, icon: Icon }) => (
          <Tabs.Tab
            key={value}
            value={value}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary data-active:bg-primary/15 data-active:text-primary data-active:ring-1 data-active:ring-primary/25 sm:min-h-12 sm:flex-row sm:gap-2 sm:text-sm"
          >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <Tabs.Panel value="program" keepMounted className="data-hidden:hidden">
        <ProgrammingWizard
          key={wizardKey}
          disciplines={allDisciplines}
          templates={allTemplates}
          locations={allLocations}
          today={today}
          throughDate={throughDate}
          initialMode={hash === "#one-off-heading" ? "once" : "weekly"}
          preset={preset}
          onDirtyChange={setDirty}
          onDisciplineCreated={onDisciplineCreated}
          onClassCreated={onClassCreated}
          onLocationCreated={onLocationCreated}
        />
      </Tabs.Panel>
      <Tabs.Panel
        value="classes"
        keepMounted
        className="space-y-5 data-hidden:hidden"
      >
        <Surface className="space-y-4 border-border/80 bg-surface-raised p-4 sm:p-6">
          <h2 id="class-setup-heading" className="text-lg font-bold">
            Crear clase
          </h2>
          <p className="text-sm text-muted-foreground">
            La disciplina es la actividad que enseñas. La clase define el grupo
            y los cupos; sus horarios pueden usar distintos lugares.
          </p>
          <CatalogCreationPanel
            title="Crear una disciplina"
            description="Agrupa tus clases por actividad, como boxeo, yoga o pilates."
            icon={Tags}
          >
            <DisciplineCreationForm onCreated={onDisciplineCreated} />
          </CatalogCreationPanel>
          <CatalogCreationPanel
            title="Crear una nueva clase"
            description="Define el grupo y sus cupos; luego podrás asignarle horarios y lugares."
            icon={Dumbbell}
            open={classCreationExpanded}
            onToggle={(event) => setCreationOpen(event.currentTarget.open)}
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
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
          >
            Administrar disciplinas
          </Link>
        </Surface>
        <ClassTemplateAdministrationWorkspace classes={allClasses} />
      </Tabs.Panel>
      <Tabs.Panel value="locations" keepMounted className="data-hidden:hidden">
        <Surface
          className="space-y-5 border-border/80 bg-surface-raised p-4 sm:p-6"
          aria-labelledby="location-setup-heading"
        >
          <h2 id="location-setup-heading" className="text-lg font-bold">
            Tus lugares
          </h2>
          <p className="text-sm text-muted-foreground">
            Reutiliza un lugar en todas las disciplinas que impartes allí.
          </p>
          {allLocations.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {allLocations.map((location) => (
                <li
                  key={location.id}
                  className="flex min-w-0 items-start gap-2 rounded-xl border border-border/60 bg-muted p-3 text-sm"
                >
                  <MapPin
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-primary"
                  />
                  <div className="min-w-0 wrap-anywhere">
                    <p className="font-semibold">{location.name}</p>
                    {location.address ? (
                      <p className="mt-1 text-muted-foreground">
                        {location.address}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <h3 className="font-semibold">Añadir ubicación</h3>
          <LocationCreationForm onCreated={onLocationCreated} />
        </Surface>
      </Tabs.Panel>
      <Tabs.Panel
        value="schedules"
        keepMounted
        className="space-y-5 data-hidden:hidden"
      >
        <Surface className="space-y-4 border-border/80 bg-surface-raised p-4 sm:p-6">
          <h2 id="recurring-heading" className="text-lg font-bold">
            Tus horarios semanales
          </h2>
          <p className="text-sm text-muted-foreground">
            Agrupados por clase, lugar, instructor y zona horaria. Cada día
            mantiene su registro original; no se modifica el historial.
          </p>
          <Link
            href="#programar"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <CalendarPlus aria-hidden="true" className="h-4 w-4" />
            Programar una clase
          </Link>
        </Surface>
        {schedules.length === 0 ? (
          <Surface>
            <p className="font-semibold">Todavía no hay horarios semanales</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Selecciona varios días al programar una clase y guarda o publica
              tu rutina.
            </p>
          </Surface>
        ) : (
          <ul
            aria-label="Rutinas semanales"
            className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3"
          >
            {groupProgrammingSchedules(schedules).map((group) => (
              <li key={group[0].id} className="min-w-0">
                <WeeklyRoutineCard
                  group={group}
                  canProgram={
                    !instructorMembershipId ||
                    instructorMembershipId ===
                      group[0].instructorMembershipId ||
                    canManageOtherInstructors
                  }
                  onProgram={() => programGroup(group)}
                />
              </li>
            ))}
          </ul>
        )}
      </Tabs.Panel>
    </Tabs.Root>
  );
}
