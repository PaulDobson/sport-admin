"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Globe,
  ListChecks,
  MapPin,
  Plus,
  Repeat2,
  Sliders,
  Tags,
  Timer,
  Trash2,
  Users,
} from "lucide-react";
import type {
  ClassTemplateOption,
  DisciplineOption,
} from "@/application/instructor-operations/ports/schedule-catalog-port";
import type { DayLocation } from "@/domain/instructor-operations/instructor-day";
import { Surface } from "@/presentation/components/primitives";
import { operationalTimezone } from "./session-presentation";
import {
  CatalogCreationPanel,
  ClassCreationForm,
  DisciplineCreationForm,
  LocationCreationForm,
  ProgrammingFeedback,
  programmingFieldClass as fieldClass,
  programmingLabelClass as labelClass,
  ProgrammingButton as Button,
} from "./programming-catalog-forms";
import {
  previewProgrammingAction,
  saveProgrammingAction,
  type ProgrammingActionState,
} from "./programming-actions";
import {
  addProgrammingDays,
  endTimeForDuration,
  programmingDateLabel,
  programmingDays,
} from "./programming-time";

interface Slot {
  key: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  locationId: string;
}

interface Props {
  disciplines: DisciplineOption[];
  templates: ClassTemplateOption[];
  locations: DayLocation[];
  today: string;
  throughDate: string;
  initialMode?: "weekly" | "once";
  preset?: {
    classTemplateId: string;
    locationId: string;
    timezone: string;
    instructorMembershipId?: string;
    slots: Omit<Slot, "key">[];
  };
  onDirtyChange?: (dirty: boolean) => void;
  onDisciplineCreated: (value: DisciplineOption) => void;
  onClassCreated: (value: ClassTemplateOption) => void;
  onLocationCreated: (value: DayLocation) => void;
}

const steps = [
  { label: "Clase", icon: Dumbbell },
  { label: "Lugar", icon: MapPin },
  { label: "Cuándo", icon: CalendarDays },
  { label: "Revisar", icon: ListChecks },
] as const;

const initialFeedback: ProgrammingActionState = { error: null, message: null };
const timezoneOptions = [
  operationalTimezone,
  "America/Lima",
  "America/Bogota",
  "America/Argentina/Buenos_Aires",
  "America/Mexico_City",
];

async function runProgrammingAction(
  action: (
    previous: ProgrammingActionState,
    data: FormData,
  ) => Promise<ProgrammingActionState>,
  previous: ProgrammingActionState,
  data: FormData,
): Promise<ProgrammingActionState> {
  try {
    return await action(previous, data);
  } catch (error) {
    if (
      error instanceof TypeError &&
      /fetch|network|load failed/i.test(error.message)
    ) {
      return {
        error:
          "No se pudo confirmar la respuesta. Comprueba tu conexión y reintenta sin cambiar los datos.",
        message: null,
      };
    }
    throw error;
  }
}

export function ProgrammingWizard({
  disciplines,
  templates,
  locations,
  today,
  throughDate,
  initialMode = "weekly",
  preset,
  onDirtyChange,
  onDisciplineCreated,
  onClassCreated,
  onLocationCreated,
}: Props) {
  const [step, setStep] = useState(preset ? 2 : 0);
  const [discipline, setDiscipline] = useState(
    templates.find((item) => item.id === preset?.classTemplateId)
      ?.disciplineName || "",
  );
  const [classId, setClassId] = useState(preset?.classTemplateId || "");
  const [locationId, setLocationId] = useState(preset?.locationId || "");
  const [responsibleInstructor, setResponsibleInstructor] = useState(
    preset?.instructorMembershipId,
  );
  const [selectedMode, setMode] = useState<"weekly" | "once" | null>(null);
  const mode = selectedMode ?? initialMode;
  const [startsAt, setStartsAt] = useState("18:00");
  const [endsAt, setEndsAt] = useState("19:00");
  const [duration, setDuration] = useState("60");
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [otherDay, setOtherDay] = useState(false);
  const [fromDate, setFromDate] = useState(today);
  const [untilDate, setUntilDate] = useState(throughDate);
  const [timezone, setTimezone] = useState(
    preset?.timezone || operationalTimezone,
  );
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [personalized, setPersonalized] = useState(Boolean(preset));
  const [slots, setSlots] = useState<Slot[]>(
    preset
      ? preset.slots.map((slot, index) => ({
          ...slot,
          key: `preset-${index}`,
        }))
      : [1, 3, 5].map((day) => ({
          key: `day-${day}`,
          dayOfWeek: day,
          startsAt: "18:00",
          endsAt: "19:00",
          locationId: "",
        })),
  );
  const [operationId, setOperationId] = useState("");
  const [intent, setIntent] = useState("publish");
  const [allowConflict, setAllowConflict] = useState(false);
  const [review, setReview] = useState<ProgrammingActionState | null>(null);
  const [saveFeedback, setSaveFeedback] =
    useState<ProgrammingActionState>(initialFeedback);
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const [published, setPublished] = useState(false);

  const selectedClass = templates.find((item) => item.id === classId);
  const selectedLocation = locations.find((item) => item.id === locationId);
  const availableDisciplines = [
    ...new Set([
      ...disciplines.map((item) => item.name),
      ...templates.map((item) => item.disciplineName),
    ]),
  ];
  const filteredClasses = discipline
    ? templates.filter((item) => item.disciplineName === discipline)
    : templates;
  const selectedDiscipline = disciplines.find(
    (item) => item.name === discipline,
  );
  const payload = {
    operationId,
    classTemplateId: classId,
    timezone,
    mode,
    fromDate: mode === "once" ? date : fromDate,
    throughDate: mode === "once" ? (otherDay ? endDate : date) : untilDate,
    waitlistEnabled,
    allowConflict,
    instructorMembershipId: responsibleInstructor,
    slots:
      mode === "once"
        ? [
            {
              dayOfWeek: new Date(`${date}T12:00:00Z`).getUTCDay(),
              startsAt,
              endsAt,
              locationId,
              date,
              endDate: otherDay ? endDate : date,
            },
          ]
        : slots.map(
            ({
              dayOfWeek,
              startsAt: start,
              endsAt: end,
              locationId: place,
            }) => ({
              dayOfWeek,
              startsAt: start,
              endsAt: end,
              locationId: place || locationId,
            }),
          ),
  };
  const reviewedPayload = useRef<typeof payload | null>(null);
  const reviewedFingerprint = useRef<string | null>(null);
  const [previewState, previewAction, previewPending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      const id = operationId || crypto.randomUUID();
      const nextIntent = String(data.get("intent") || "publish");
      setOperationId(id);
      const request = { ...payload, operationId: id };
      data.set("programming", JSON.stringify(request));
      const result = await runProgrammingAction(
        previewProgrammingAction,
        previous,
        data,
      );
      setIntent(nextIntent);
      setSaveFeedback(initialFeedback);
      if (result.preview && !result.error) {
        reviewedPayload.current = request;
        reviewedFingerprint.current = result.preview.fingerprint ?? null;
      }
      setReview(result);
      setAllowConflict(false);
      if (result.preview && !result.error) setStep(3);
      return result;
    },
    initialFeedback,
  );
  const [savedState, saveAction, savePending] = useActionState(
    async (previous: ProgrammingActionState, data: FormData) => {
      if (!reviewedPayload.current)
        return {
          error: "Revisa la programación antes de guardarla.",
          message: null,
        };
      data.set(
        "programming",
        JSON.stringify({ ...reviewedPayload.current, allowConflict }),
      );
      data.set("previewFingerprint", reviewedFingerprint.current ?? "");
      const result = await runProgrammingAction(
        saveProgrammingAction,
        previous,
        data,
      );
      setSaveFeedback(result);
      if (result.message && !result.error) setPublished(true);
      if (result.preview) setReview(result);
      return result;
    },
    initialFeedback,
  );
  const pending = previewPending || savePending;
  const dirty = Boolean(classId || locationId || discipline);

  useEffect(() => {
    onDirtyChange?.(dirty && !published);
  }, [dirty, published, onDirtyChange]);
  useEffect(() => {
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [step, published]);
  useEffect(() => {
    if (!dirty || published) return;
    const preventLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventLeaving);
    return () => window.removeEventListener("beforeunload", preventLeaving);
  }, [dirty, published]);

  function invalidateReview() {
    reviewedPayload.current = null;
    reviewedFingerprint.current = null;
    setReview(null);
    setAllowConflict(false);
    setOperationId("");
    setSaveFeedback(initialFeedback);
  }
  function changeCommonTime(start: string, end: string) {
    setStartsAt(start);
    setEndsAt(end);
    if (!personalized)
      setSlots((current) =>
        current.map((slot) => ({ ...slot, startsAt: start, endsAt: end })),
      );
    invalidateReview();
  }
  function changeDuration(value: string) {
    setDuration(value);
    const end = endTimeForDuration(startsAt, Number(value));
    if (!end) return;
    changeCommonTime(startsAt, end.time);
    if (mode === "once") {
      setOtherDay(end.nextDays > 0);
      setEndDate(addProgrammingDays(date, end.nextDays));
    }
  }
  function toggleDay(day: number) {
    setSlots((current) =>
      current.some((slot) => slot.dayOfWeek === day)
        ? current.filter((slot) => slot.dayOfWeek !== day)
        : [
            ...current,
            {
              key: crypto.randomUUID(),
              dayOfWeek: day,
              startsAt,
              endsAt,
              locationId,
            },
          ],
    );
    invalidateReview();
  }
  function updateSlot(key: string, values: Partial<Slot>) {
    setSlots((current) =>
      current.map((slot) => (slot.key === key ? { ...slot, ...values } : slot)),
    );
    invalidateReview();
  }
  function back() {
    if (pending) return;
    setStep((current) => Math.max(0, current - 1));
    setAllowConflict(false);
  }
  function continueStep(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMode(mode);
    setStep((current) => current + 1);
  }
  const occurrenceFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CL", {
        timeZone: timezone,
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [timezone],
  );
  const conflictList = review?.preview?.conflicts ?? [];

  // ── Sidebar summary card ───────────────────────────────────────────────────
  const summaryCard = (
    <div className="space-y-3.5 text-sm">
      {/* Class */}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Dumbbell aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold wrap-anywhere">
            {selectedClass?.name ?? (
              <span className="text-muted-foreground">Sin clase</span>
            )}
          </p>
          {selectedClass ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Users aria-hidden="true" className="h-3 w-3" />
              {selectedClass.disciplineName} · {selectedClass.capacity} cupos
            </p>
          ) : null}
        </div>
      </div>

      {/* Location */}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="wrap-anywhere">
            {selectedLocation?.name ?? (
              <span className="text-muted-foreground">Sin lugar</span>
            )}
          </p>
          {selectedLocation?.address ? (
            <p className="mt-0.5 text-xs text-muted-foreground wrap-anywhere">
              {selectedLocation.address}
            </p>
          ) : null}
        </div>
      </div>

      {/* Schedule */}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Clock aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 w-full">
          {mode === "weekly" ? (
            <ul className="space-y-1">
              {[...slots]
                .sort(
                  (a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7),
                )
                .map((slot) => (
                  <li key={slot.key} className="wrap-anywhere text-xs">
                    <span className="font-semibold">
                      {
                        programmingDays.find((d) => d.value === slot.dayOfWeek)
                          ?.short
                      }
                    </span>{" "}
                    {slot.startsAt}–{slot.endsAt}
                    {slot.locationId && slot.locationId !== locationId
                      ? ` · ${locations.find((l) => l.id === slot.locationId)?.name}`
                      : ""}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-xs">
              {programmingDateLabel(date)} · {startsAt}–{endsAt}
              {otherDay ? ` (${programmingDateLabel(endDate)})` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Timezone (only when non-default) */}
      {timezone !== operationalTimezone ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {timezone.replaceAll("_", " ")}
        </div>
      ) : null}
    </div>
  );

  // ── Published ──────────────────────────────────────────────────────────────
  if (published)
    return (
      <div className="space-y-5">
        <Surface
          className="border-success/30 bg-linear-to-br from-success/15 via-success/5 to-card p-5 sm:p-7"
          aria-labelledby="programming-complete"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-success/20 text-success">
            <Check aria-hidden="true" className="h-5 w-5" />
          </span>
          <h2
            ref={heading}
            tabIndex={-1}
            id="programming-complete"
            className="mt-3 text-2xl font-bold tracking-tight outline-none sm:text-3xl"
          >
            Programación guardada
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Las sesiones que ya existían conservan sus cambios, cupos, reservas
            y estado.
          </p>
        </Surface>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Surface className="space-y-5">
            <ProgrammingFeedback
              state={saveFeedback.error ? saveFeedback : initialFeedback}
            />
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/schedule"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <CalendarCheck2 aria-hidden="true" className="h-4 w-4" />
                Ver en la agenda
              </Link>
              <Button
                onClick={() => {
                  setPublished(false);
                  setStep(0);
                  setReview(null);
                  setOperationId("");
                  setAllowConflict(false);
                  setResponsibleInstructor(undefined);
                  reviewedPayload.current = null;
                  reviewedFingerprint.current = null;
                }}
              >
                Programar otra clase
              </Button>
            </div>
          </Surface>

          <Surface aria-label="Resumen de la programación">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <ListChecks
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground"
              />
              Resumen
            </h3>
            {summaryCard}
          </Surface>
        </div>
      </div>
    );

  // ── Wizard ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4" aria-labelledby="programming-wizard-heading">
      {/* Compact page header */}
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <CalendarDays aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2
            id="programming-wizard-heading"
            className="text-lg font-bold leading-tight"
          >
            Programar clase
          </h2>
          <p className="text-sm text-muted-foreground">
            Elige qué, dónde y cuándo. Revisa antes de publicar.
          </p>
        </div>
      </div>

      {/* Step indicator — icon-only on mobile, icon+label on sm+ */}
      <ol
        aria-label="Pasos para programar"
        className="grid grid-cols-4 gap-1.5"
      >
        {steps.map(({ label, icon: Icon }, index) => {
          const isActive = index === step;
          const isDone = index < step;
          return (
            <li
              key={label}
              aria-current={isActive ? "step" : undefined}
              className={[
                "flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-center transition-colors sm:flex-row sm:justify-center sm:gap-2 sm:px-3 sm:py-2",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : isDone
                    ? "border-success/40 bg-success/8 text-success"
                    : "border-border text-muted-foreground",
              ].join(" ")}
            >
              {isDone ? (
                <Check aria-label="Completado" className="h-4 w-4 shrink-0" />
              ) : (
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              )}
              <span className="text-xs font-semibold leading-tight">
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {/*
       * Desktop layout: 2-column grid shared by all steps.
       * Left  = main form content  (grows)
       * Right = summary + catalog panels  (fixed 22rem)
       *
       * On mobile everything stacks naturally.
       */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── LEFT: main form card ─────────────────────────────────────── */}
        <Surface className="min-w-0 space-y-6 p-5 sm:p-6">
          {/* Step heading */}
          <h3
            ref={heading}
            tabIndex={-1}
            className="flex items-center gap-2 text-base font-bold outline-none"
          >
            {(() => {
              const { icon: Icon } = steps[step];
              return (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
              );
            })()}
            {steps[step].label}
          </h3>

          {/* ── Step 0: Clase ─────────────────────────────────────────── */}
          {step === 0 ? (
            <form onSubmit={continueStep} className="space-y-5">
              {/* 2-column on desktop: Disciplina | Clase */}
              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  <span className="flex items-center gap-1.5">
                    <Tags
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-muted-foreground"
                    />
                    Disciplina
                  </span>
                  <select
                    value={discipline}
                    onChange={(event) => {
                      setDiscipline(event.target.value);
                      setClassId("");
                      invalidateReview();
                    }}
                    className={fieldClass}
                  >
                    <option value="">Todas</option>
                    {availableDisciplines.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelClass}>
                  <span className="flex items-center gap-1.5">
                    <Dumbbell
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-muted-foreground"
                    />
                    Clase
                  </span>
                  <select
                    required
                    value={classId}
                    onChange={(event) => {
                      setClassId(event.target.value);
                      invalidateReview();
                    }}
                    className={fieldClass}
                  >
                    <option value="">Selecciona una clase</option>
                    {filteredClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.capacity} cupos
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {templates.length === 0 ? (
                disciplines.length === 0 ? (
                  /* Neither discipline nor class exists yet */
                  <div
                    className="flex items-start gap-3 rounded-xl border border-primary/50 bg-primary/10 px-4 py-3 text-sm ring-1 ring-primary/20"
                    style={{
                      animation: "neon-pulse 2.5s ease-in-out infinite",
                    }}
                  >
                    <span className="relative mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/25 text-primary ring-1 ring-primary/50">
                      <Tags aria-hidden="true" className="h-3.5 w-3.5" />
                      <span
                        aria-hidden="true"
                        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary"
                      >
                        <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75" />
                      </span>
                    </span>
                    <p className="text-foreground">
                      <span className="font-bold text-primary">
                        Primero crea una disciplina
                      </span>{" "}
                      y luego una clase.{" "}
                      <span className="hidden text-muted-foreground lg:inline">
                        Panel derecho ↗
                      </span>
                      <span className="text-muted-foreground lg:hidden">
                        Desliza abajo ↓
                      </span>
                    </p>
                  </div>
                ) : (
                  /* Has disciplines but no classes */
                  <div
                    className="flex items-start gap-3 rounded-xl border border-primary/50 bg-primary/10 px-4 py-3 text-sm ring-1 ring-primary/20"
                    style={{
                      animation: "neon-pulse 2.5s ease-in-out infinite",
                    }}
                  >
                    <span className="relative mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/25 text-primary ring-1 ring-primary/50">
                      <Dumbbell aria-hidden="true" className="h-3.5 w-3.5" />
                      <span
                        aria-hidden="true"
                        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary"
                      >
                        <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75" />
                      </span>
                    </span>
                    <p className="text-foreground">
                      <span className="font-bold text-primary">
                        Ahora crea una clase
                      </span>{" "}
                      para asignarle horarios.{" "}
                      <span className="hidden text-muted-foreground lg:inline">
                        Panel derecho ↗
                      </span>
                      <span className="text-muted-foreground lg:hidden">
                        Debajo ↓
                      </span>
                    </p>
                  </div>
                )
              ) : null}

              <Button type="submit" variant="primary">
                Continuar
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </form>
          ) : null}

          {/* ── Step 1: Lugar ─────────────────────────────────────────── */}
          {step === 1 ? (
            <form onSubmit={continueStep} className="space-y-5">
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <MapPin
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-muted-foreground"
                  />
                  Lugar
                </span>
                <select
                  value={locationId}
                  required
                  onChange={(event) => {
                    const id = event.target.value;
                    setLocationId(id);
                    setSlots((current) =>
                      current.map((slot) => ({
                        ...slot,
                        locationId:
                          slot.locationId === locationId ? id : slot.locationId,
                      })),
                    );
                    invalidateReview();
                  }}
                  className={fieldClass}
                >
                  <option value="">Selecciona un lugar</option>
                  {locations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.address ? ` · ${item.address}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <p className="text-sm text-muted-foreground">
                Este lugar aplica a todos los horarios. Puedes cambiarlo por día
                en el paso siguiente.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button onClick={back}>
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  Atrás
                </Button>
                <Button type="submit" variant="primary">
                  Continuar
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : null}

          {/* ── Step 2: Cuándo ────────────────────────────────────────── */}
          {step === 2 ? (
            <form action={previewAction} className="space-y-6">
              <fieldset disabled={pending} className="min-w-0 space-y-6">
                <legend className="sr-only">Fechas y horarios</legend>

                {/* Mode cards */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                  {(
                    [
                      {
                        value: "once",
                        label: "Una fecha",
                        icon: CalendarCheck2,
                      },
                      { value: "weekly", label: "Semanal", icon: Repeat2 },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    return (
                      <label
                        key={item.value}
                        className={[
                          "flex min-h-14 cursor-pointer items-center gap-2.5 rounded-xl border px-4 text-sm font-semibold transition-colors",
                          mode === item.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-border/80 hover:bg-surface-raised",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name="mode"
                          value={item.value}
                          checked={mode === item.value}
                          onChange={() => {
                            setMode(item.value);
                            invalidateReview();
                          }}
                          className="sr-only"
                        />
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                        {item.label}
                      </label>
                    );
                  })}
                </div>

                {/* Weekly: day grid */}
                {mode === "weekly" ? (
                  <fieldset>
                    <legend className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold">
                      <CalendarRange
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-muted-foreground"
                      />
                      Días de la semana
                    </legend>
                    <div className="grid grid-cols-7 gap-1.5">
                      {programmingDays.map((day) => {
                        const active = slots.some(
                          (s) => s.dayOfWeek === day.value,
                        );
                        return (
                          <button
                            key={day.value}
                            type="button"
                            aria-label={day.name}
                            aria-pressed={active}
                            onClick={() => toggleDay(day.value)}
                            className={[
                              "min-h-11 rounded-lg border text-xs font-bold transition-colors",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-border/80 hover:bg-surface-raised",
                            ].join(" ")}
                          >
                            {day.short}
                          </button>
                        );
                      })}
                    </div>
                    {slots.length === 0 ? (
                      <p role="alert" className="mt-2 text-sm text-destructive">
                        Selecciona al menos un día.
                      </p>
                    ) : null}
                  </fieldset>
                ) : (
                  /* Once: date field */
                  <label className={labelClass}>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-muted-foreground"
                      />
                      Fecha
                    </span>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(event) => {
                        setDate(event.target.value);
                        if (!otherDay || endDate < event.target.value)
                          setEndDate(event.target.value);
                        invalidateReview();
                      }}
                      className={fieldClass}
                    />
                  </label>
                )}

                {/* Time controls (common or once mode) */}
                {!personalized || mode === "once" ? (
                  <div className="space-y-4">
                    {/* 3-column on wider screens: Inicio | Duración | Término */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className={labelClass}>
                        <span className="flex items-center gap-1.5">
                          <Clock
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-muted-foreground"
                          />
                          Inicio
                        </span>
                        <input
                          type="time"
                          required
                          value={startsAt}
                          onChange={(event) => {
                            const start = event.target.value;
                            const end = endTimeForDuration(
                              start,
                              Number(duration),
                            );
                            changeCommonTime(start, end?.time || endsAt);
                            if (mode === "once" && end) {
                              setOtherDay(end.nextDays > 0);
                              setEndDate(
                                addProgrammingDays(date, end.nextDays),
                              );
                            }
                          }}
                          className={fieldClass}
                        />
                      </label>
                      <label className={labelClass}>
                        <span className="flex items-center gap-1.5">
                          <Timer
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-muted-foreground"
                          />
                          Duración (min)
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={mode === "weekly" ? 1439 : 2880}
                          value={duration}
                          onChange={(event) =>
                            changeDuration(event.target.value)
                          }
                          className={fieldClass}
                        />
                      </label>
                      <label className={labelClass}>
                        <span className="flex items-center gap-1.5">
                          <Clock
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-muted-foreground"
                          />
                          Término
                        </span>
                        <input
                          type="time"
                          required
                          value={endsAt}
                          onChange={(event) => {
                            changeCommonTime(startsAt, event.target.value);
                            const [sh, sm] = startsAt.split(":").map(Number);
                            const [eh, em] = event.target.value
                              .split(":")
                              .map(Number);
                            const extraDays =
                              mode === "once" && otherDay
                                ? (Date.parse(`${endDate}T12:00:00Z`) -
                                    Date.parse(`${date}T12:00:00Z`)) /
                                  86_400_000
                                : 0;
                            const minutes =
                              eh * 60 + em - (sh * 60 + sm) + extraDays * 1440;
                            if (minutes > 0) setDuration(String(minutes));
                            else setDuration("");
                          }}
                          className={fieldClass}
                        />
                      </label>
                    </div>

                    {/* Quick chips */}
                    <div className="flex gap-2">
                      {[45, 60, 90].map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={duration === String(value)}
                          onClick={() => changeDuration(String(value))}
                          className={[
                            "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold transition-colors",
                            duration === String(value)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/50 hover:bg-primary/8 hover:text-primary",
                          ].join(" ")}
                        >
                          {value} min
                        </button>
                      ))}
                    </div>

                    {mode === "weekly" && endsAt <= startsAt ? (
                      <p role="alert" className="text-sm text-destructive">
                        El horario semanal debe terminar después de comenzar.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* Once: overnight */}
                {mode === "once" ? (
                  <>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-surface-raised">
                      <input
                        type="checkbox"
                        checked={otherDay}
                        onChange={(event) => {
                          setOtherDay(event.target.checked);
                          setEndDate(
                            event.target.checked
                              ? addProgrammingDays(date, 1)
                              : date,
                          );
                          invalidateReview();
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                      Termina otro día
                    </label>
                    {otherDay ? (
                      <label className={labelClass}>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-muted-foreground"
                          />
                          Fecha de término
                        </span>
                        <input
                          type="date"
                          min={date}
                          required
                          value={endDate}
                          onChange={(event) => {
                            setEndDate(event.target.value);
                            invalidateReview();
                          }}
                          className={fieldClass}
                        />
                      </label>
                    ) : null}
                  </>
                ) : (
                  <>
                    {/* Weekly: per-day customization */}
                    {!personalized ? (
                      <button
                        type="button"
                        onClick={() => setPersonalized(true)}
                        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <Sliders
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0"
                        />
                        Personalizar horario por día
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Ajusta cada franja y su lugar. Puedes añadir más de
                          una franja el mismo día.
                        </p>
                        {programmingDays
                          .filter((day) =>
                            slots.some((s) => s.dayOfWeek === day.value),
                          )
                          .map((day) => (
                            <fieldset
                              key={day.value}
                              className="min-w-0 rounded-xl border border-border p-3"
                            >
                              <legend className="px-1 text-sm font-bold">
                                {day.name}
                              </legend>
                              <div className="space-y-4">
                                {slots
                                  .filter((s) => s.dayOfWeek === day.value)
                                  .map((slot, index) => (
                                    <div
                                      key={slot.key}
                                      className="grid min-w-0 gap-3 border-b border-border pb-4 last:border-0 sm:grid-cols-2"
                                    >
                                      <label className={labelClass}>
                                        <span className="flex items-center gap-1.5">
                                          <Clock
                                            aria-hidden="true"
                                            className="h-3.5 w-3.5 text-muted-foreground"
                                          />
                                          Inicio · {index + 1}
                                        </span>
                                        <input
                                          type="time"
                                          required
                                          value={slot.startsAt}
                                          onChange={(event) =>
                                            updateSlot(slot.key, {
                                              startsAt: event.target.value,
                                            })
                                          }
                                          className={fieldClass}
                                        />
                                      </label>
                                      <label className={labelClass}>
                                        <span className="flex items-center gap-1.5">
                                          <Clock
                                            aria-hidden="true"
                                            className="h-3.5 w-3.5 text-muted-foreground"
                                          />
                                          Término · {index + 1}
                                        </span>
                                        <input
                                          type="time"
                                          required
                                          value={slot.endsAt}
                                          onChange={(event) =>
                                            updateSlot(slot.key, {
                                              endsAt: event.target.value,
                                            })
                                          }
                                          className={fieldClass}
                                        />
                                      </label>
                                      <label className={labelClass}>
                                        <span className="flex items-center gap-1.5">
                                          <MapPin
                                            aria-hidden="true"
                                            className="h-3.5 w-3.5 text-muted-foreground"
                                          />
                                          Lugar · {index + 1}
                                        </span>
                                        <select
                                          value={slot.locationId || locationId}
                                          onChange={(event) =>
                                            updateSlot(slot.key, {
                                              locationId: event.target.value,
                                            })
                                          }
                                          required
                                          className={fieldClass}
                                        >
                                          {locations.map((item) => (
                                            <option
                                              key={item.id}
                                              value={item.id}
                                            >
                                              {item.name}
                                              {item.address
                                                ? ` · ${item.address}`
                                                : ""}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <div className="flex items-end">
                                        <Button
                                          variant="danger"
                                          aria-label={`Eliminar franja ${index + 1} de ${day.name}`}
                                          onClick={() => {
                                            setSlots((current) =>
                                              current.filter(
                                                (item) => item.key !== slot.key,
                                              ),
                                            );
                                            invalidateReview();
                                          }}
                                        >
                                          <Trash2
                                            aria-hidden="true"
                                            className="h-4 w-4"
                                          />
                                          Eliminar
                                        </Button>
                                      </div>
                                      {slot.endsAt <= slot.startsAt ? (
                                        <p
                                          role="alert"
                                          className="text-sm text-destructive sm:col-span-2"
                                        >
                                          El término debe ser posterior al
                                          inicio.
                                        </p>
                                      ) : null}
                                    </div>
                                  ))}
                              </div>
                              <Button
                                className="mt-3"
                                disabled={slots.length >= 28}
                                onClick={() => {
                                  setSlots((current) => [
                                    ...current,
                                    {
                                      key: crypto.randomUUID(),
                                      dayOfWeek: day.value,
                                      startsAt,
                                      endsAt,
                                      locationId,
                                    },
                                  ]);
                                  invalidateReview();
                                }}
                              >
                                <Plus aria-hidden="true" className="h-4 w-4" />
                                Añadir franja
                              </Button>
                            </fieldset>
                          ))}
                      </div>
                    )}

                    {/* Date range */}
                    <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2">
                      <legend className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                        <CalendarRange
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-muted-foreground"
                        />
                        Período a publicar
                      </legend>
                      <label className={labelClass}>
                        Desde
                        <input
                          type="date"
                          required
                          value={fromDate}
                          onChange={(event) => {
                            setFromDate(event.target.value);
                            invalidateReview();
                          }}
                          className={fieldClass}
                        />
                      </label>
                      <label className={labelClass}>
                        Hasta (máx. 8 semanas)
                        <input
                          type="date"
                          required
                          min={fromDate}
                          max={
                            fromDate
                              ? addProgrammingDays(fromDate, 56)
                              : undefined
                          }
                          value={untilDate}
                          onChange={(event) => {
                            setUntilDate(event.target.value);
                            invalidateReview();
                          }}
                          className={fieldClass}
                        />
                      </label>
                    </fieldset>
                  </>
                )}

                {/* Advanced options */}
                <details className="group overflow-hidden rounded-xl border border-border transition-colors open:border-primary/30">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                    <Sliders
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                    />
                    <span className="flex-1">
                      Opciones · {timezone.replaceAll("_", " ")}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                    />
                  </summary>
                  <div className="space-y-4 border-t border-border px-4 py-4">
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <Globe
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-muted-foreground"
                        />
                        Zona horaria
                      </span>
                      <select
                        value={timezone}
                        onChange={(event) => {
                          setTimezone(event.target.value);
                          invalidateReview();
                        }}
                        className={fieldClass}
                      >
                        {[...new Set([timezone, ...timezoneOptions])].map(
                          (value) => (
                            <option key={value} value={value}>
                              {value.replaceAll("_", " ")}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Las fechas se comprueban en esta zona. La agenda se
                      muestra en hora de Santiago.
                    </p>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-surface-raised">
                      <input
                        type="checkbox"
                        checked={waitlistEnabled}
                        onChange={(event) => {
                          setWaitlistEnabled(event.target.checked);
                          invalidateReview();
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                      Permitir lista de espera
                    </label>
                  </div>
                </details>

                <ProgrammingFeedback
                  state={previewState.error ? previewState : initialFeedback}
                />

                <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                  <Button onClick={back} disabled={pending}>
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    Atrás
                  </Button>
                  <Button
                    type="submit"
                    name="intent"
                    value="publish"
                    variant="primary"
                    isLoading={previewPending}
                    disabled={
                      mode === "weekly" &&
                      (slots.length === 0 ||
                        slots.some((s) => s.endsAt <= s.startsAt))
                    }
                  >
                    <ListChecks aria-hidden="true" className="h-4 w-4" />
                    Revisar y publicar
                  </Button>
                  {mode === "weekly" ? (
                    <Button
                      type="submit"
                      name="intent"
                      value="save"
                      disabled={
                        slots.length === 0 ||
                        slots.some((s) => s.endsAt <= s.startsAt)
                      }
                    >
                      Solo guardar horarios
                    </Button>
                  ) : null}
                </div>
              </fieldset>
            </form>
          ) : null}

          {/* ── Step 3: Revisar ───────────────────────────────────────── */}
          {step === 3 && review?.preview ? (
            <form action={saveAction} className="space-y-5">
              <input
                type="hidden"
                name="programming"
                value={JSON.stringify(payload)}
              />
              <input type="hidden" name="intent" value={intent} />

              {/* Mobile-only summary (desktop shows it in the right column) */}
              <div className="lg:hidden rounded-xl border border-border bg-surface-raised/50 p-4">
                {summaryCard}
              </div>

              {/* Date range label */}
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarRange
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0"
                />
                {mode === "weekly"
                  ? `${programmingDateLabel(fromDate)} al ${programmingDateLabel(untilDate)}`
                  : programmingDateLabel(date)}
              </p>

              {/* Result pill */}
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl bg-primary/10 p-4"
              >
                <CalendarCheck2
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                />
                <p className="text-sm font-semibold">
                  {intent === "save"
                    ? `Se guardarán ${slots.length} horarios sin publicar sesiones.`
                    : `${review.preview.newCount === 1 ? "1 sesión nueva" : `${review.preview.newCount} sesiones nuevas`} · ${review.preview.existingCount === 1 ? "1 existente se conservará" : `${review.preview.existingCount} existentes se conservarán`}.`}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                No se sobrescriben sesiones existentes, cancelaciones, reservas
                ni cambios individuales.
              </p>

              {/* Conflicts */}
              {conflictList.length > 0 ? (
                <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/8 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-warning"
                    />
                    Hay cruces de horarios
                  </h4>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm">
                    {conflictList.map((conflict, index) => (
                      <li key={index}>{conflict.message}</li>
                    ))}
                  </ul>
                  <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={allowConflict}
                      onChange={(event) =>
                        setAllowConflict(event.target.checked)
                      }
                      disabled={pending}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                    Revisé los cruces y confirmo que puedo impartir estas
                    clases.
                  </label>
                  <Button onClick={back} disabled={pending}>
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    Cambiar horario
                  </Button>
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground">
                Los cruces se comprueban dentro del período seleccionado. Las
                horas inexistentes por cambio de horario requieren otra
                selección.
              </p>

              {/* Occurrences */}
              {review.preview.occurrences.length > 0 ? (
                <details className="group overflow-hidden rounded-xl border border-border transition-colors open:border-primary/30">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                    <CalendarDays
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                    />
                    <span className="flex-1">
                      Ver fechas y horarios ({review.preview.occurrences.length}
                      )
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                    />
                  </summary>
                  <ul className="max-h-72 space-y-3 overflow-y-auto border-t border-border px-4 py-3 text-sm">
                    {review.preview.occurrences.map((occurrence, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Clock
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        />
                        <span>
                          <time dateTime={occurrence.startsAt}>
                            {occurrenceFormatter.format(
                              new Date(occurrence.startsAt),
                            )}
                          </time>
                          {" – "}
                          <time dateTime={occurrence.endsAt}>
                            {occurrenceFormatter.format(
                              new Date(occurrence.endsAt),
                            )}
                          </time>
                          {" · "}
                          {
                            locations.find(
                              (item) => item.id === occurrence.locationId,
                            )?.name
                          }
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              <ProgrammingFeedback state={savedState} />

              <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                <Button onClick={back} disabled={pending}>
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  Atrás
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={savePending}
                  disabled={
                    pending ||
                    (conflictList.length > 0 && !allowConflict) ||
                    (intent === "publish" &&
                      review.preview.newCount === 0 &&
                      review.preview.existingCount === 0)
                  }
                >
                  <CalendarDays aria-hidden="true" className="h-4 w-4" />
                  {intent === "save" ? "Guardar horarios" : "Publicar clases"}
                </Button>
              </div>
            </form>
          ) : null}
        </Surface>

        {/* ── RIGHT: summary + catalog panels ─────────────────────────── */}
        <div className="space-y-4">
          {/* Summary card — always visible on desktop */}
          <Surface aria-label="Resumen de la programación">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <ListChecks
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground"
              />
              Tu programación
            </h3>
            {summaryCard}
          </Surface>

          {/* Step 0: catalog creation panels in the right column on desktop */}
          {step === 0 ? (
            <>
              <CatalogCreationPanel
                title="Crear disciplina"
                description="Agrupa tus clases por actividad, como boxeo, yoga o pilates."
                icon={Tags}
                open={disciplineOpen || disciplines.length === 0}
                highlight={disciplines.length === 0}
                onToggle={(event) =>
                  setDisciplineOpen(event.currentTarget.open)
                }
              >
                <DisciplineCreationForm
                  onCreated={(value) => {
                    onDisciplineCreated(value);
                    setDiscipline(value.name);
                    setClassId("");
                    setDisciplineOpen(false);
                    setClassOpen(true);
                    invalidateReview();
                  }}
                />
              </CatalogCreationPanel>
              <CatalogCreationPanel
                title="Crear clase"
                description="Define el grupo y sus cupos; luego podrás asignarle horarios."
                icon={Dumbbell}
                open={classOpen || templates.length === 0}
                highlight={disciplines.length > 0 && templates.length === 0}
                onToggle={(event) => setClassOpen(event.currentTarget.open)}
              >
                <ClassCreationForm
                  key={selectedDiscipline?.id || "all"}
                  disciplines={disciplines}
                  defaultDisciplineId={selectedDiscipline?.id}
                  onCreated={(value) => {
                    onClassCreated(value);
                    setClassId(value.id);
                    setDiscipline(value.disciplineName);
                    setClassOpen(false);
                    invalidateReview();
                  }}
                />
              </CatalogCreationPanel>
            </>
          ) : null}

          {/* Step 1: location creation panel in the right column on desktop */}
          {step === 1 ? (
            <CatalogCreationPanel
              title="Crear lugar"
              description="Agrega una sala, gimnasio o espacio donde dictas tus clases."
              icon={MapPin}
              open={locationOpen || locations.length === 0}
              highlight={locations.length === 0}
              onToggle={(event) => setLocationOpen(event.currentTarget.open)}
            >
              <LocationCreationForm
                onCreated={(value) => {
                  onLocationCreated(value);
                  setLocationId(value.id);
                  setLocationOpen(false);
                  invalidateReview();
                }}
              />
            </CatalogCreationPanel>
          ) : null}
        </div>
      </div>

      {/*
       * Mobile-only: catalog panels stacked below the main card.
       * On desktop these live in the right column above, so we hide them here.
       */}
      {step === 0 ? (
        <div className="space-y-3 lg:hidden">
          <CatalogCreationPanel
            title="Crear disciplina"
            description="Agrupa tus clases por actividad, como boxeo, yoga o pilates."
            icon={Tags}
            open={disciplineOpen || disciplines.length === 0}
            highlight={disciplines.length === 0}
            onToggle={(event) => setDisciplineOpen(event.currentTarget.open)}
          >
            <DisciplineCreationForm
              onCreated={(value) => {
                onDisciplineCreated(value);
                setDiscipline(value.name);
                setClassId("");
                setDisciplineOpen(false);
                setClassOpen(true);
                invalidateReview();
              }}
            />
          </CatalogCreationPanel>
          <CatalogCreationPanel
            title="Crear clase"
            description="Define el grupo y sus cupos; luego podrás asignarle horarios."
            icon={Dumbbell}
            open={classOpen || templates.length === 0}
            highlight={disciplines.length > 0 && templates.length === 0}
            onToggle={(event) => setClassOpen(event.currentTarget.open)}
          >
            <ClassCreationForm
              key={selectedDiscipline?.id || "all"}
              disciplines={disciplines}
              defaultDisciplineId={selectedDiscipline?.id}
              onCreated={(value) => {
                onClassCreated(value);
                setClassId(value.id);
                setDiscipline(value.disciplineName);
                setClassOpen(false);
                invalidateReview();
              }}
            />
          </CatalogCreationPanel>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="lg:hidden">
          <CatalogCreationPanel
            title="Crear lugar"
            description="Agrega una sala, gimnasio o espacio donde dictas tus clases."
            icon={MapPin}
            open={locationOpen || locations.length === 0}
            highlight={locations.length === 0}
            onToggle={(event) => setLocationOpen(event.currentTarget.open)}
          >
            <LocationCreationForm
              onCreated={(value) => {
                onLocationCreated(value);
                setLocationId(value.id);
                setLocationOpen(false);
                invalidateReview();
              }}
            />
          </CatalogCreationPanel>
        </div>
      ) : null}
    </div>
  );
}
