"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Info,
  Loader2,
  Pencil,
  PlusCircle,
  Users,
  X,
} from "lucide-react";
import { computeFullMacrocycleDistribution } from "@/domain/efc-training";
import type {
  MacrocycleDistribution,
  EstructuraSubdistribution,
} from "@/domain/efc-training";
import type { Student } from "@/domain/instructor-operations/student";
import type { EfcMacrocycle } from "@/domain/efc-training";
import { saveMacrocycleAction, updateMacrocycleAction } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  athletes: Student[];
  initialAthleteId: string | null;
  existingMacrocycles: EfcMacrocycle[];
  tenantId: string;
}

interface FormState {
  athleteId: string;
  startDate: string;
  competitionDate: string;
  hoursPerSession: number;
  trainingDaysPerWeek: number;
  sessionsPerDay: number;
  ePercentage: number;
  fPercentage: number;
  cPercentage: number;
  justification: string;
}

type FullDistribution = MacrocycleDistribution & {
  subdistributions: {
    e: EstructuraSubdistribution;
    f: ReturnType<
      typeof computeFullMacrocycleDistribution
    >["subdistributions"]["f"];
    c: ReturnType<
      typeof computeFullMacrocycleDistribution
    >["subdistributions"]["c"];
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format minutes as HH:MM string. */
function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Format minutes as human-readable "Xh YYm" string. */
function formatHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

const DEFAULT_PERCENTAGES = { e: 50, f: 30, c: 20 };

// ─── Subdistribution rows helper ─────────────────────────────────────────────

interface SubRow {
  label: string;
  minutes: number;
}

function getESubRows(sub: EstructuraSubdistribution): SubRow[] {
  return [
    { label: "Adaptación Anatómica", minutes: sub.adaptAnatomica },
    { label: "Capacidades Condicionales", minutes: sub.condicional },
    { label: "Capacidades Coordinativas", minutes: sub.coordinativo },
    { label: "Técnica", minutes: sub.tecnico },
    { label: "Táctica Simple", minutes: sub.tacticoSimple },
  ];
}

function getFSubRows(sub: FullDistribution["subdistributions"]["f"]): SubRow[] {
  return [
    { label: "Capacidades Condicionales", minutes: sub.condicional },
    { label: "Capacidades Coordinativas", minutes: sub.coordinativo },
    { label: "Técnica", minutes: sub.tecnico },
    { label: "Táctica Simple", minutes: sub.tacticoSimple },
    { label: "Táctica Compleja", minutes: sub.tacticoComplejo },
  ];
}

function getCSubRows(sub: FullDistribution["subdistributions"]["c"]): SubRow[] {
  return [
    { label: "Capacidades Condicionales", minutes: sub.condicional },
    { label: "Capacidades Coordinativas", minutes: sub.coordinativo },
    { label: "Táctica Compleja", minutes: sub.tacticoComplejo },
  ];
}

// ─── MacrocycleTimeline ───────────────────────────────────────────────────────

interface TimelineProps {
  distribution: FullDistribution;
}

/** Week cell coloured by EFC period. */
function MacrocycleTimeline({ distribution }: TimelineProps) {
  const { totalWeeks, estructuraSemanas, funcionSemanas, cognicionSemanas } =
    distribution;

  // Build an array of week descriptors
  const weeks: Array<{ period: "E" | "F" | "C"; weekNo: number }> = [];
  for (let i = 0; i < Math.round(estructuraSemanas); i++) {
    weeks.push({ period: "E", weekNo: i + 1 });
  }
  for (let i = 0; i < Math.round(funcionSemanas); i++) {
    weeks.push({ period: "F", weekNo: weeks.length + 1 });
  }
  for (let i = 0; i < Math.round(cognicionSemanas); i++) {
    weeks.push({ period: "C", weekNo: weeks.length + 1 });
  }

  // Pad to totalWeeks if rounding left gaps
  while (weeks.length < totalWeeks) {
    const last = weeks[weeks.length - 1]?.period ?? "C";
    weeks.push({ period: last, weekNo: weeks.length + 1 });
  }

  const CELL_STYLES: Record<"E" | "F" | "C", string> = {
    E: "bg-blue-500/20 border-blue-500/40 text-blue-300",
    F: "bg-green-500/20 border-green-500/40 text-green-300",
    C: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  };

  const LEGEND = [
    {
      period: "E" as const,
      label: "Estructura",
      style: "bg-blue-500/20 border-blue-500/40 text-blue-300",
    },
    {
      period: "F" as const,
      label: "Función",
      style: "bg-green-500/20 border-green-500/40 text-green-300",
    },
    {
      period: "C" as const,
      label: "Cognición",
      style: "bg-amber-500/20 border-amber-500/40 text-amber-300",
    },
  ];

  return (
    <section
      aria-label="Línea de tiempo del macrociclo"
      className="space-y-3 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Línea de tiempo</h3>
        <div className="flex flex-wrap gap-3">
          {LEGEND.map(({ period, label, style }) => (
            <span
              key={period}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium ${style}`}
            >
              <span
                className="h-2 w-2 rounded-full bg-current opacity-70"
                aria-hidden="true"
              />
              {period} — {label}
            </span>
          ))}
        </div>
      </div>

      {/* Scrollable grid */}
      <div
        className="overflow-x-auto pb-1"
        role="list"
        aria-label={`${totalWeeks} semanas del macrociclo`}
      >
        <div
          className="
            grid gap-1
            grid-cols-10
            sm:grid-cols-13
            lg:grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))]
          "
          style={{ minWidth: "min-content" }}
        >
          {weeks.map(({ period, weekNo }) => (
            <div
              key={weekNo}
              role="listitem"
              aria-label={`Semana ${weekNo} — ${period === "E" ? "Estructura" : period === "F" ? "Función" : "Cognición"}`}
              className={`
                flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border
                text-xs font-semibold
                sm:h-9 sm:w-auto sm:min-w-[2.25rem]
                ${CELL_STYLES[period]}
              `}
            >
              {period}
            </div>
          ))}
        </div>
      </div>

      {/* Period summary row */}
      <div className="mt-1 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-blue-500/10 px-2 py-1.5">
          <p className="font-semibold text-blue-300">Estructura</p>
          <p className="text-muted-foreground">
            {Math.round(estructuraSemanas)} sem.
          </p>
        </div>
        <div className="rounded-lg bg-green-500/10 px-2 py-1.5">
          <p className="font-semibold text-green-300">Función</p>
          <p className="text-muted-foreground">
            {Math.round(funcionSemanas)} sem.
          </p>
        </div>
        <div className="rounded-lg bg-amber-500/10 px-2 py-1.5">
          <p className="font-semibold text-amber-300">Cognición</p>
          <p className="text-muted-foreground">
            {Math.round(cognicionSemanas)} sem.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── MacrocyclePlannerClient ──────────────────────────────────────────────────

export function MacrocyclePlannerClient({
  athletes,
  initialAthleteId,
  existingMacrocycles,
  tenantId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    athleteId: initialAthleteId ?? athletes[0]?.id ?? "",
    startDate: "",
    competitionDate: "",
    hoursPerSession: 1.5,
    trainingDaysPerWeek: 5,
    sessionsPerDay: 1,
    ePercentage: DEFAULT_PERCENTAGES.e,
    fPercentage: DEFAULT_PERCENTAGES.f,
    cPercentage: DEFAULT_PERCENTAGES.c,
    justification: "",
  });

  // ── Computed distribution ─────────────────────────────────────────────────
  const [distribution, setDistribution] = useState<FullDistribution | null>(
    null,
  );
  const [calcError, setCalcError] = useState<string | null>(null);

  // ── Save state ────────────────────────────────────────────────────────────
  const [saveResult, setSaveResult] = useState<
    { success: true; id: string } | { success: false; error: string } | null
  >(null);

  // ── Active subdistribution tab ────────────────────────────────────────────
  const [activePeriod, setActivePeriod] = useState<"E" | "F" | "C">("E");

  // ── Edit mode — the macrocycle being edited (null = create mode) ──────────
  const [selectedMacrocycle, setSelectedMacrocycle] =
    useState<EfcMacrocycle | null>(null);

  function selectMacrocycle(m: EfcMacrocycle) {
    setSelectedMacrocycle(m);
    setForm({
      athleteId: m.athleteId,
      startDate: m.startDate,
      competitionDate: m.competitionDate,
      hoursPerSession: m.hoursPerSession,
      trainingDaysPerWeek: m.trainingDaysPerWeek,
      sessionsPerDay: m.sessionsPerDay,
      ePercentage: m.ePercentage,
      fPercentage: m.fPercentage,
      cPercentage: m.cPercentage,
      justification: m.justification ?? "",
    });
    setSaveResult(null);
    // Scroll to form
    setTimeout(
      () =>
        document
          .getElementById("macrocycle-form-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  }

  function clearSelection() {
    setSelectedMacrocycle(null);
    setForm({
      athleteId: initialAthleteId ?? athletes[0]?.id ?? "",
      startDate: "",
      competitionDate: "",
      hoursPerSession: 1.5,
      trainingDaysPerWeek: 5,
      sessionsPerDay: 1,
      ePercentage: DEFAULT_PERCENTAGES.e,
      fPercentage: DEFAULT_PERCENTAGES.f,
      cPercentage: DEFAULT_PERCENTAGES.c,
      justification: "",
    });
    setSaveResult(null);
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const percentSum = form.ePercentage + form.fPercentage + form.cPercentage;
  const percentagesAreDefault =
    form.ePercentage === DEFAULT_PERCENTAGES.e &&
    form.fPercentage === DEFAULT_PERCENTAGES.f &&
    form.cPercentage === DEFAULT_PERCENTAGES.c;
  const showJustification = !percentagesAreDefault;
  const justificationValid =
    !showJustification || form.justification.trim().length >= 20;

  const dateOrderValid =
    !form.startDate ||
    !form.competitionDate ||
    form.startDate < form.competitionDate;

  const canSave =
    !!form.athleteId &&
    !!form.startDate &&
    !!form.competitionDate &&
    dateOrderValid &&
    percentSum === 100 &&
    justificationValid &&
    distribution !== null &&
    distribution.totalWeeks >= 10 &&
    !isPending;

  // ── Recalculation (debounced 500 ms) ──────────────────────────────────────
  const recalculate = useCallback(() => {
    if (!form.startDate || !form.competitionDate) {
      setDistribution(null);
      setCalcError(null);
      return;
    }
    if (!dateOrderValid) {
      setDistribution(null);
      setCalcError(null);
      return;
    }
    if (percentSum !== 100) {
      setDistribution(null);
      setCalcError(null);
      return;
    }
    try {
      const result = computeFullMacrocycleDistribution({
        startDate: form.startDate,
        competitionDate: form.competitionDate,
        hoursPerSession: form.hoursPerSession,
        trainingDaysPerWeek: form.trainingDaysPerWeek,
        sessionsPerDay: form.sessionsPerDay,
        ePercentage: form.ePercentage,
        fPercentage: form.fPercentage,
        cPercentage: form.cPercentage,
      });
      setDistribution(result);
      setCalcError(null);
    } catch (err) {
      setDistribution(null);
      setCalcError(err instanceof Error ? err.message : "Error en los datos.");
    }
  }, [
    form.startDate,
    form.competitionDate,
    form.hoursPerSession,
    form.trainingDaysPerWeek,
    form.sessionsPerDay,
    form.ePercentage,
    form.fPercentage,
    form.cPercentage,
    percentSum,
    dateOrderValid,
  ]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(recalculate, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [recalculate]);

  // ── Field updater ─────────────────────────────────────────────────────────
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveResult(null);
  }

  // ── Save / Update ─────────────────────────────────────────────────────────
  function handleSave() {
    if (!canSave) return;
    const fd = new FormData();
    fd.set("athleteId", form.athleteId);
    fd.set("startDate", form.startDate);
    fd.set("competitionDate", form.competitionDate);
    fd.set("hoursPerSession", String(form.hoursPerSession));
    fd.set("trainingDaysPerWeek", String(form.trainingDaysPerWeek));
    fd.set("sessionsPerDay", String(form.sessionsPerDay));
    fd.set("ePercentage", String(form.ePercentage));
    fd.set("fPercentage", String(form.fPercentage));
    fd.set("cPercentage", String(form.cPercentage));
    if (form.justification) fd.set("justification", form.justification);

    startTransition(async () => {
      const result = selectedMacrocycle
        ? await updateMacrocycleAction(selectedMacrocycle.id, fd)
        : await saveMacrocycleAction(fd);
      setSaveResult(result);
      if (result.success) {
        router.push(
          `/dashboard/trainings/efc/macrocycle?athleteId=${form.athleteId}&saved=${result.id}`,
        );
        router.refresh();
      }
    });
  }

  // ── Subdistribution rows for the active period ────────────────────────────
  const subRows: SubRow[] = distribution
    ? activePeriod === "E"
      ? getESubRows(distribution.subdistributions.e)
      : activePeriod === "F"
        ? getFSubRows(distribution.subdistributions.f)
        : getCSubRows(distribution.subdistributions.c)
    : [];

  // ── Active period total minutes ────────────────────────────────────────────
  const activePeriodMinutes = distribution
    ? activePeriod === "E"
      ? distribution.estructuraMinutes
      : activePeriod === "F"
        ? distribution.funcionMinutes
        : distribution.cognicionMinutes
    : 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Disclaimer banner ─────────────────────────────────────────── */}
      <div
        role="note"
        className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Los porcentajes EFC son orientativos y no constituyen prescripción
          científica validada.
        </p>
      </div>

      {/* ── Existing macrocycles list ─────────────────────────────────── */}
      {existingMacrocycles.length > 0 && (
        <details className="group rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary">
            <Calendar
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="flex-1">
              Macrociclos existentes
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {existingMacrocycles.length}
              </span>
            </span>
            <ChevronDown
              className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="divide-y divide-border border-t border-border">
            {existingMacrocycles.map((m) => {
              const isSelected = selectedMacrocycle?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    isSelected ? clearSelection() : selectMacrocycle(m)
                  }
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary ${
                    isSelected ? "bg-primary/10" : ""
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${isSelected ? "Deseleccionar" : "Editar"} macrociclo ${new Date(m.startDate).toLocaleDateString("es-CL")} al ${new Date(m.competitionDate).toLocaleDateString("es-CL")}`}
                >
                  <span className="flex-1 text-left text-muted-foreground">
                    {new Date(m.startDate).toLocaleDateString("es-CL")}
                    {" → "}
                    {new Date(m.competitionDate).toLocaleDateString("es-CL")}
                  </span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    E{m.ePercentage}/F{m.fPercentage}/C{m.cPercentage}
                  </span>
                  {isSelected ? (
                    <X
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <Pencil
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </details>
      )}

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <section
        id="macrocycle-form-section"
        aria-label="Formulario de macrociclo"
        className="rounded-xl border border-border bg-card"
      >
        {/* Section header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
            aria-hidden="true"
          >
            {selectedMacrocycle ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
          </span>
          <div className="flex-1">
            {selectedMacrocycle ? (
              <>
                <h2 className="text-sm font-semibold">Editar macrociclo</h2>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedMacrocycle.startDate).toLocaleDateString(
                    "es-CL",
                  )}
                  {" → "}
                  {new Date(
                    selectedMacrocycle.competitionDate,
                  ).toLocaleDateString("es-CL")}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold">Nuevo macrociclo</h2>
                <p className="text-xs text-muted-foreground">
                  Define el período de planificación y los parámetros de carga.
                </p>
              </>
            )}
          </div>
          {selectedMacrocycle && (
            <button
              type="button"
              onClick={clearSelection}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Cancelar edición y crear nuevo"
            >
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Nuevo
            </button>
          )}
        </div>

        <div className="space-y-6 p-5">
          {/* Athlete selector */}
          <label className="grid gap-1.5 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden="true" />
              Deportista
            </span>
            <select
              value={form.athleteId}
              onChange={(e) => update("athleteId", e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              aria-required="true"
            >
              <option value="" disabled>
                — Elegir deportista —
              </option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          </label>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Fecha de inicio
              </span>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                aria-required="true"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Fecha de competencia
              </span>
              <input
                type="date"
                value={form.competitionDate}
                onChange={(e) => update("competitionDate", e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                aria-required="true"
              />
            </label>
          </div>

          {/* Date validation error */}
          {form.startDate && form.competitionDate && !dateOrderValid && (
            <p
              role="alert"
              className="flex items-center gap-2 text-xs text-red-400"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              La fecha de competencia debe ser posterior a la fecha de inicio.
            </p>
          )}

          {/* Load parameters */}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Horas por sesión
              </span>
              <input
                type="number"
                min={0.5}
                max={8.0}
                step={0.5}
                value={form.hoursPerSession}
                onChange={(e) =>
                  update("hoursPerSession", parseFloat(e.target.value) || 1.5)
                }
                className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-muted-foreground">
                Días de entrenamiento / semana
              </span>
              <input
                type="number"
                min={1}
                max={7}
                step={1}
                value={form.trainingDaysPerWeek}
                onChange={(e) =>
                  update(
                    "trainingDaysPerWeek",
                    Math.min(7, Math.max(1, parseInt(e.target.value, 10) || 5)),
                  )
                }
                className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              />
            </label>

            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-muted-foreground">
                Sesiones por día
              </span>
              <input
                type="number"
                min={1}
                max={5}
                step={1}
                value={form.sessionsPerDay}
                onChange={(e) =>
                  update(
                    "sessionsPerDay",
                    Math.min(5, Math.max(1, parseInt(e.target.value, 10) || 1)),
                  )
                }
                className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              />
            </label>
          </div>

          {/* EFC percentages */}
          <fieldset className="space-y-3">
            <legend className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Info className="h-4 w-4" aria-hidden="true" />
              Distribución EFC (%)
              {percentSum !== 100 && (
                <span
                  role="alert"
                  className="ml-auto rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-400"
                >
                  Suma: {percentSum}% (debe ser 100%)
                </span>
              )}
              {percentSum === 100 && (
                <span className="ml-auto rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                  ✓ 100%
                </span>
              )}
            </legend>

            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  {
                    key: "ePercentage" as const,
                    label: "Estructura (E)",
                    color: "text-blue-400",
                  },
                  {
                    key: "fPercentage" as const,
                    label: "Función (F)",
                    color: "text-green-400",
                  },
                  {
                    key: "cPercentage" as const,
                    label: "Cognición (C)",
                    color: "text-amber-400",
                  },
                ] as const
              ).map(({ key, label, color }) => (
                <label key={key} className="grid gap-1.5 text-sm">
                  <span className={`font-medium ${color}`}>{label}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={form[key]}
                    onChange={(e) =>
                      update(
                        key,
                        Math.min(
                          100,
                          Math.max(0, parseInt(e.target.value, 10) || 0),
                        ),
                      )
                    }
                    className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          {/* Justification (shown only when percentages differ from default) */}
          {showJustification && (
            <label className="grid gap-1.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <Info className="h-4 w-4" aria-hidden="true" />
                Justificación de la distribución
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  mín. 20 caracteres
                </span>
              </span>
              <textarea
                value={form.justification}
                onChange={(e) => update("justification", e.target.value)}
                rows={3}
                placeholder="Explica por qué los porcentajes difieren de los valores predeterminados (50/30/20)…"
                className="w-full rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary resize-none"
                aria-required="true"
              />
              {form.justification.trim().length > 0 &&
                form.justification.trim().length < 20 && (
                  <p role="alert" className="text-xs text-red-400">
                    La justificación debe tener al menos 20 caracteres (
                    {form.justification.trim().length}/20).
                  </p>
                )}
            </label>
          )}

          {/* Domain error */}
          {calcError &&
            form.startDate &&
            form.competitionDate &&
            dateOrderValid &&
            percentSum === 100 && (
              <p
                role="alert"
                className="flex items-center gap-2 text-xs text-red-400"
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {calcError}
              </p>
            )}

          {/* Save button */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45"
              aria-busy={isPending}
            >
              {isPending ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  {selectedMacrocycle ? "Actualizando…" : "Guardando…"}
                </>
              ) : selectedMacrocycle ? (
                <>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Actualizar macrociclo
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Guardar macrociclo
                </>
              )}
            </button>

            {saveResult?.success === false && (
              <p
                role="alert"
                className="flex items-center gap-2 text-sm text-red-400"
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {saveResult.error}
              </p>
            )}
            {saveResult?.success === true && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-green-400"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {selectedMacrocycle
                  ? "Macrociclo actualizado correctamente."
                  : "Macrociclo guardado correctamente."}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Real-time results ─────────────────────────────────────────── */}
      {distribution && distribution.totalWeeks >= 10 && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Semanas totales",
                value: distribution.totalWeeks,
                unit: "sem",
              },
              {
                label: "Horas totales",
                value: distribution.totalHours.toFixed(1),
                unit: "h",
              },
              {
                label: "Tiempo Estructura",
                value: formatHHMM(distribution.estructuraMinutes),
                unit: "",
              },
              {
                label: "Tiempo Función",
                value: formatHHMM(distribution.funcionMinutes),
                unit: "",
              },
            ].map(({ label, value, unit }) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums">
                  {value}
                  {unit && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {unit}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* EFC minutes breakdown */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold">
              Distribución de minutos (HH:MM)
            </h3>
            <div className="space-y-3">
              {(
                [
                  {
                    period: "E" as const,
                    label: "Estructura",
                    minutes: distribution.estructuraMinutes,
                    barColor: "bg-blue-400",
                    textColor: "text-blue-400",
                    pct: form.ePercentage,
                  },
                  {
                    period: "F" as const,
                    label: "Función",
                    minutes: distribution.funcionMinutes,
                    barColor: "bg-green-400",
                    textColor: "text-green-400",
                    pct: form.fPercentage,
                  },
                  {
                    period: "C" as const,
                    label: "Cognición",
                    minutes: distribution.cognicionMinutes,
                    barColor: "bg-amber-400",
                    textColor: "text-amber-400",
                    pct: form.cPercentage,
                  },
                ] as const
              ).map(({ period, label, minutes, barColor, textColor, pct }) => (
                <div key={period}>
                  <div className="flex justify-between text-xs">
                    <span className={`font-medium ${textColor}`}>
                      {label} ({pct}%)
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatHHMM(minutes)}{" "}
                      <span className="text-muted-foreground/60">
                        ({formatHoursMinutes(minutes)})
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${label} ${pct}%`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subdistributions panel */}
          <section
            aria-label="Subdistribuciones internas por período"
            className="rounded-xl border border-border bg-card"
          >
            {/* Period tab selector */}
            <div
              className="flex border-b border-border"
              role="tablist"
              aria-label="Período activo"
            >
              {(
                [
                  {
                    period: "E" as const,
                    label: "Estructura",
                    color: "text-blue-400",
                    border: "border-blue-500",
                  },
                  {
                    period: "F" as const,
                    label: "Función",
                    color: "text-green-400",
                    border: "border-green-500",
                  },
                  {
                    period: "C" as const,
                    label: "Cognición",
                    color: "text-amber-400",
                    border: "border-amber-500",
                  },
                ] as const
              ).map(({ period, label, color, border }) => (
                <button
                  key={period}
                  type="button"
                  role="tab"
                  aria-selected={activePeriod === period}
                  onClick={() => setActivePeriod(period)}
                  className={`
                    flex-1 py-3 text-sm font-medium transition-colors
                    focus-visible:outline-2 focus-visible:outline-primary
                    ${
                      activePeriod === period
                        ? `border-b-2 ${border} ${color}`
                        : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  {period} — {label}
                </button>
              ))}
            </div>

            {/* Subdistribution rows */}
            <div
              role="tabpanel"
              aria-label={`Subdistribución de ${activePeriod === "E" ? "Estructura" : activePeriod === "F" ? "Función" : "Cognición"}`}
              className="p-5"
            >
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Total del período:</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatHHMM(activePeriodMinutes)}
                </span>
              </div>
              <div className="space-y-2.5">
                {subRows.map((row) => {
                  const pct =
                    activePeriodMinutes > 0
                      ? (row.minutes / activePeriodMinutes) * 100
                      : 0;
                  const barColor =
                    activePeriod === "E"
                      ? "bg-blue-400"
                      : activePeriod === "F"
                        ? "bg-green-400"
                        : "bg-amber-400";
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {row.label}
                        </span>
                        <span className="tabular-nums text-foreground">
                          {formatHHMM(row.minutes)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${pct.toFixed(1)}%` }}
                          role="progressbar"
                          aria-valuenow={Math.round(pct)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${row.label}: ${formatHHMM(row.minutes)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Task 8.3 — Visual timeline */}
          <MacrocycleTimeline distribution={distribution} />
        </div>
      )}

      {/* Minimum weeks warning */}
      {distribution &&
        distribution.totalWeeks > 0 &&
        distribution.totalWeeks < 10 && (
          <div
            role="alert"
            className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <p>
              El macrociclo debe tener al menos 10 semanas. Actualmente tiene{" "}
              <strong>{distribution.totalWeeks}</strong> semanas.
            </p>
          </div>
        )}
    </div>
  );
}
