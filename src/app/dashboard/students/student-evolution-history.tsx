"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flame,
  Heart,
  Pencil,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Weight,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import { StudentActionForm } from "./student-workspace";
import { StudentField, StudentSelect } from "./student-fields";
import type {
  MetricDefinition,
  MetricEvaluation,
  MetricEvaluationType,
} from "@/domain/evolution-health-attendance/metric";
import {
  recordEvaluationAction,
  updateEvaluationAction,
  deleteEvaluationAction,
  createCustomMetricAction,
  seedDefaultMetricsAction,
  type StudentDetailFormState,
} from "./[studentId]/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const initialState: StudentDetailFormState = { error: null, saved: false };

function formatValue(value: unknown, unit?: string): string {
  if (typeof value === "number") {
    const formatted = Number.isInteger(value)
      ? String(value)
      : value.toFixed(1);
    return unit ? `${formatted} ${unit}` : formatted;
  }
  return String(value ?? "—");
}

function getTrend(
  current: number,
  previous: number,
  slug: string,
): "up" | "down" | "neutral" {
  if (Math.abs(current - previous) < 0.01) return "neutral";
  // Lower is better for: fat %, speed/time metrics, weight (body comp)
  const lowerIsBetter = slug.includes("fat") || slug.includes("speed");
  const isUp = current > previous;
  if (lowerIsBetter) return isUp ? "down" : "up";
  return isUp ? "up" : "down";
}

// ─────────────────────────────────────────────────────────────────────────────
// Category icons & config
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  MetricEvaluationType,
  { label: string; icon: typeof Activity; accent: string; bg: string }
> = {
  body_composition: {
    label: "Composición corporal",
    icon: Weight,
    accent: "text-blue-400",
    bg: "bg-blue-400/10 ring-blue-400/20",
  },
  strength: {
    label: "Fuerza",
    icon: Dumbbell,
    accent: "text-orange-400",
    bg: "bg-orange-400/10 ring-orange-400/20",
  },
  cardio: {
    label: "Cardio / Velocidad",
    icon: Heart,
    accent: "text-pink-400",
    bg: "bg-pink-400/10 ring-pink-400/20",
  },
  custom: {
    label: "Personalizados",
    icon: Zap,
    accent: "text-primary",
    bg: "bg-primary/10 ring-primary/20",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Trend indicator
// ─────────────────────────────────────────────────────────────────────────────

function TrendBadge({
  trend,
  delta,
}: {
  trend: "up" | "down" | "neutral";
  delta: string;
}) {
  if (trend === "neutral") return null;
  const isPositive = trend === "up";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        isPositive
          ? "bg-success/15 text-success"
          : "bg-destructive/15 text-destructive"
      }`}
    >
      {isPositive ? (
        <TrendingUp aria-hidden className="h-2.5 w-2.5" />
      ) : (
        <TrendingDown aria-hidden className="h-2.5 w-2.5" />
      )}
      {delta}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline (SVG mini-chart, no dependencies)
// ─────────────────────────────────────────────────────────────────────────────

function Sparkline({ values, accent }: { values: number[]; accent: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 80;
  const H = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        strokeWidth={1.5}
        className={accent}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric summary card — latest value + trend
// ─────────────────────────────────────────────────────────────────────────────

function MetricSummaryCard({
  definition,
  evaluations,
}: {
  definition: MetricDefinition;
  evaluations: MetricEvaluation[];
}) {
  const cfg = CATEGORY_CONFIG[definition.evaluationType];
  const Icon = cfg.icon;

  // ── Memoized: only recomputes when this card's evaluations change,
  // NOT when the parent re-renders due to activeView tab changes.
  const { numericValues, latest, trend, delta } = useMemo(() => {
    const sorted = [...evaluations].sort(
      (a, b) => a.evaluatedAt.getTime() - b.evaluatedAt.getTime(),
    );
    const numericValues = sorted
      .map((e) => e.values[definition.slug])
      .filter((v): v is number => typeof v === "number");

    const latest = sorted.at(-1);
    const previous = sorted.at(-2);
    const latestVal = latest?.values[definition.slug];
    const previousVal = previous?.values[definition.slug];

    const trend =
      typeof latestVal === "number" && typeof previousVal === "number"
        ? getTrend(latestVal, previousVal, definition.slug)
        : ("neutral" as const);

    const delta =
      typeof latestVal === "number" && typeof previousVal === "number"
        ? `${latestVal > previousVal ? "+" : ""}${(latestVal - previousVal).toFixed(1)} ${definition.unit ?? ""}`
        : null;

    return { numericValues, latest, trend, delta };
  }, [evaluations, definition.slug, definition.unit]);

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/6 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${cfg.bg}`}
          >
            <Icon aria-hidden className={`h-4 w-4 ${cfg.accent}`} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">
              {definition.name}
            </p>
            {definition.timeWindowSeconds ? (
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                <Timer aria-hidden className="h-2.5 w-2.5" />
                {definition.timeWindowSeconds}s
              </p>
            ) : null}
          </div>
        </div>
        {delta && trend !== "neutral" ? (
          <TrendBadge trend={trend} delta={delta.trim()} />
        ) : null}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="metric-number text-2xl font-bold text-foreground">
            {latest
              ? formatValue(latest.values[definition.slug], definition.unit)
              : "—"}
          </p>
          {latest ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {DATE_FMT.format(latest.evaluatedAt)}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Sin registros
            </p>
          )}
        </div>
        {numericValues.length >= 2 ? (
          <Sparkline values={numericValues} accent={cfg.accent} />
        ) : null}
      </div>

      {/* Count */}
      {evaluations.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {evaluations.length} evaluación{evaluations.length !== 1 ? "es" : ""}
        </p>
      ) : null}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit form — shown inline when the instructor clicks "Editar"
// ─────────────────────────────────────────────────────────────────────────────

function EvaluationEditForm({
  evaluation,
  definitions,
  studentId,
  onClose,
}: {
  evaluation: MetricEvaluation;
  definitions: MetricDefinition[];
  studentId: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateEvaluationAction,
    initialState,
  );

  const dateStr = evaluation.evaluatedAt.toISOString().slice(0, 10);
  const presentSlugs = Object.keys(evaluation.values);
  const presentDefs = definitions.filter((d) => presentSlugs.includes(d.slug));

  // ── Auto-close after successful save — useEffect prevents executing a side
  // effect directly in the render body (which fires twice in Strict Mode).
  useEffect(() => {
    if (!state.saved) return;
    const id = setTimeout(onClose, 700);
    return () => clearTimeout(id);
  }, [state.saved, onClose]);

  return (
    <StudentActionForm
      action={formAction}
      pending={pending}
      feedback={state}
      className="border-t border-white/6 px-4 pb-4 pt-3 space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Editar evaluación
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancelar edición"
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface-raised hover:text-foreground"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>

      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="evaluationId" value={evaluation.id} />

      {/* Date */}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted-foreground">Fecha</span>
        <StudentField
          type="date"
          name="evaluatedAt"
          defaultValue={dateStr}
          required
          className="h-10 w-full max-w-xs rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
        />
      </label>

      {/* One field per metric already in this evaluation */}
      <div className="grid gap-3 sm:grid-cols-2">
        {presentDefs.map((def) => (
          <label key={def.slug} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground">
              {def.name}
              {def.unit ? (
                <span className="ml-1 text-[11px] text-muted-foreground/60">
                  ({def.unit})
                </span>
              ) : null}
            </span>
            <StudentField
              type="number"
              name={`metric_${def.slug}`}
              step="0.1"
              min={def.validationRules?.min}
              max={def.validationRules?.max}
              defaultValue={
                typeof evaluation.values[def.slug] === "number"
                  ? String(evaluation.values[def.slug])
                  : ""
              }
              required
              className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
            />
          </label>
        ))}
      </div>

      {/* Notes */}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted-foreground">
          Notas <span className="text-muted-foreground/60">(opcional)</span>
        </span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={evaluation.notes ?? ""}
          placeholder="Observaciones..."
          className="min-w-0 rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-success">
          Evaluación actualizada.
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="submit"
          variant="primary"
          isLoading={pending}
          className="min-h-10 flex-1 sm:flex-none"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button
          type="button"
          variant="quiet"
          onClick={onClose}
          disabled={pending}
          className="min-h-10"
        >
          Cancelar
        </Button>
      </div>
    </StudentActionForm>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation history row
// ─────────────────────────────────────────────────────────────────────────────

function EvaluationHistoryRow({
  evaluation,
  definitions,
  defsMap,
  studentId,
}: {
  evaluation: MetricEvaluation;
  definitions: MetricDefinition[];
  defsMap: Map<string, MetricDefinition>;
  studentId: string;
}) {
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteEvaluationAction,
    initialState,
  );
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const entries = Object.entries(evaluation.values);

  return (
    <li className="rounded-xl border border-white/6 bg-card overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => {
          if (editing) return; // header tap does nothing while edit form is open
          setExpanded((v) => !v);
        }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={expanded || editing}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {DATE_FMT.format(evaluation.evaluatedAt)}
          </p>
          {!expanded && !editing ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {entries
                .slice(0, 3)
                .map(([slug, val]) => {
                  // ── O(1) lookup via Map instead of O(n) find()
                  const def = defsMap.get(slug);
                  return `${def?.name ?? slug}: ${formatValue(val, def?.unit)}`;
                })
                .join(" · ")}
              {entries.length > 3 ? ` · +${entries.length - 3} más` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Pencil shortcut — stops propagation so the row doesn't toggle */}
          {!editing ? (
            <span
              role="button"
              aria-label="Editar evaluación"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
                setExpanded(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  setEditing(true);
                  setExpanded(false);
                }
              }}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              <Pencil aria-hidden className="h-3.5 w-3.5" />
            </span>
          ) : null}
          {expanded || editing ? (
            <ChevronUp aria-hidden className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown
              aria-hidden
              className="h-4 w-4 text-muted-foreground"
            />
          )}
        </div>
      </button>

      {/* Edit mode */}
      {editing ? (
        <EvaluationEditForm
          evaluation={evaluation}
          definitions={definitions}
          studentId={studentId}
          onClose={() => setEditing(false)}
        />
      ) : null}

      {/* Read mode expanded */}
      {expanded && !editing ? (
        <div className="border-t border-white/6 px-4 pb-4 pt-3">
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {entries.map(([slug, val]) => {
              // ── O(1) lookup via Map instead of O(n) find()
              const def = defsMap.get(slug);
              return (
                <div key={slug}>
                  <dt className="text-xs text-muted-foreground">
                    {def?.name ?? slug}
                  </dt>
                  <dd className="metric-number mt-0.5 font-semibold">
                    {formatValue(val, def?.unit)}
                  </dd>
                </div>
              );
            })}
          </dl>

          {evaluation.notes ? (
            <p className="mt-3 rounded-lg border border-white/6 bg-surface-raised px-3 py-2 text-xs text-muted-foreground">
              {evaluation.notes}
            </p>
          ) : null}

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(true);
                setExpanded(false);
              }}
              className="h-8 gap-1.5 px-3 text-xs"
            >
              <Pencil aria-hidden className="h-3.5 w-3.5" />
              Editar
            </Button>

            <StudentActionForm
              action={deleteFormAction}
              pending={deletePending}
              feedback={deleteState}
              className="contents"
            >
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="evaluationId" value={evaluation.id} />
              {deleteState.error ? (
                <p role="alert" className="w-full text-xs text-destructive">
                  {deleteState.error}
                </p>
              ) : null}
              <Button
                type="submit"
                variant="danger"
                isLoading={deletePending}
                className="h-8 gap-1.5 px-3 text-xs"
              >
                <Trash2 aria-hidden className="h-3.5 w-3.5" />
                Eliminar
              </Button>
            </StudentActionForm>
          </div>
        </div>
      ) : null}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New evaluation form
// ─────────────────────────────────────────────────────────────────────────────

function NewEvaluationForm({
  studentId,
  definitions,
  todayStr,
}: {
  studentId: string;
  definitions: MetricDefinition[];
  todayStr: string;
}) {
  const [state, formAction, pending] = useActionState(
    recordEvaluationAction,
    initialState,
  );
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const toggle = (slug: string) =>
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );

  const grouped = Object.groupBy(definitions, (d) => d.evaluationType);

  return (
    <section
      aria-labelledby="new-eval-heading"
      className="rounded-2xl border border-white/6 bg-card p-4 sm:p-5"
    >
      <h3
        id="new-eval-heading"
        className="flex items-center gap-2 text-base font-semibold"
      >
        <Plus aria-hidden className="h-4 w-4 text-primary" />
        Nueva evaluación
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Selecciona las métricas a evaluar e ingresa los valores.
      </p>

      <StudentActionForm
        action={formAction}
        pending={pending}
        feedback={state}
        className="mt-4 space-y-4"
      >
        <input type="hidden" name="studentId" value={studentId} />

        {/* Date */}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted-foreground">
            Fecha de evaluación
          </span>
          <StudentField
            type="date"
            name="evaluatedAt"
            defaultValue={todayStr}
            required
            className="h-11 w-full max-w-xs rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
          />
        </label>

        {/* Metric selector per category */}
        {(
          [
            "body_composition",
            "strength",
            "cardio",
            "custom",
          ] as MetricEvaluationType[]
        ).map((type) => {
          const defs = grouped[type] ?? [];
          if (defs.length === 0) return null;
          const cfg = CATEGORY_CONFIG[type];
          const Icon = cfg.icon;
          return (
            <fieldset key={type} className="space-y-2">
              <legend className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Icon aria-hidden className={`h-3.5 w-3.5 ${cfg.accent}`} />
                {cfg.label}
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {defs.map((def) => {
                  const active = selectedSlugs.includes(def.slug);
                  return (
                    <div key={def.slug}>
                      {/* Toggle chip */}
                      <button
                        type="button"
                        onClick={() => toggle(def.slug)}
                        aria-pressed={active}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                          active
                            ? "border-primary/40 bg-primary/8 text-foreground"
                            : "border-white/8 bg-surface-raised text-muted-foreground hover:border-white/15"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{def.name}</span>
                          {def.timeWindowSeconds ? (
                            <span className="flex items-center gap-1 text-[11px] opacity-70">
                              <Timer aria-hidden className="h-2.5 w-2.5" />
                              En {def.timeWindowSeconds}s
                            </span>
                          ) : def.unit ? (
                            <span className="text-[11px] opacity-70">
                              {def.unit}
                            </span>
                          ) : null}
                        </span>
                        <span
                          aria-hidden
                          className={`h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
                            active
                              ? "border-primary bg-primary"
                              : "border-white/20"
                          }`}
                        />
                      </button>

                      {/* Value input — visible when toggled */}
                      {active ? (
                        <div className="mt-1.5 pl-1">
                          <label className="flex items-center gap-2 text-sm">
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {def.unit ?? "valor"}
                            </span>
                            <StudentField
                              type="number"
                              name={`metric_${def.slug}`}
                              step="0.1"
                              min={def.validationRules?.min}
                              max={def.validationRules?.max}
                              placeholder={`Ej: ${def.validationRules?.min ?? 0}`}
                              required={active}
                              className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        {/* Notes */}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted-foreground">
            Notas <span className="text-muted-foreground/60">(opcional)</span>
          </span>
          <textarea
            name="notes"
            rows={2}
            placeholder="Observaciones del instructor..."
            className="min-w-0 rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </label>

        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.saved ? (
          <p role="status" className="text-sm text-success">
            Evaluación registrada correctamente.
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          disabled={selectedSlugs.length === 0}
          isLoading={pending}
          className="min-h-11 w-full sm:w-auto"
        >
          {pending ? "Guardando..." : "Guardar evaluación"}
        </Button>
      </StudentActionForm>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom metric creation form
// ─────────────────────────────────────────────────────────────────────────────

function CustomMetricForm({ studentId }: { studentId: string }) {
  const [state, formAction, pending] = useActionState(
    createCustomMetricAction,
    initialState,
  );
  const [open, setOpen] = useState(false);
  const [withTime, setWithTime] = useState(false);

  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-card/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={open}
      >
        <Plus aria-hidden className="h-4 w-4 text-primary" />
        Crear métrica personalizada
        {open ? (
          <ChevronUp aria-hidden className="ml-auto h-4 w-4" />
        ) : (
          <ChevronDown aria-hidden className="ml-auto h-4 w-4" />
        )}
      </button>

      {open ? (
        <StudentActionForm
          action={formAction}
          pending={pending}
          feedback={state}
          className="border-t border-white/8 px-4 pb-4 pt-3 grid gap-3"
        >
          <input type="hidden" name="studentId" value={studentId} />

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground">
              Nombre de la métrica
            </span>
            <StudentField
              name="name"
              required
              placeholder="Ej: Flexiones, Saltos en caja..."
              className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-muted-foreground">Unidad</span>
              <StudentField
                name="unit"
                placeholder="Ej: reps, seg, kg..."
                className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-muted-foreground">
                Categoría
              </span>
              <StudentField
                name="category"
                placeholder="Ej: Resistencia, Agilidad..."
                className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
              />
            </label>
          </div>

          {/* Time window toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={withTime}
              onChange={(e) => setWithTime(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-muted-foreground">
              Es una prueba por tiempo (cantidad en X segundos)
            </span>
          </label>

          {withTime ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-muted-foreground">
                Ventana de tiempo (segundos)
              </span>
              <StudentField
                type="number"
                name="timeWindowSeconds"
                min="1"
                placeholder="Ej: 60"
                required
                className="h-11 w-48 rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"
              />
            </label>
          ) : null}

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          {state.saved ? (
            <p role="status" className="text-sm text-success">
              Métrica creada.
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            isLoading={pending}
            className="min-h-11 w-full sm:w-auto"
          >
            {pending ? "Creando..." : "Crear métrica"}
          </Button>
        </StudentActionForm>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state — no metrics seeded yet
// ─────────────────────────────────────────────────────────────────────────────

function EmptySeedState({ studentId }: { studentId: string }) {
  const [state, formAction, pending] = useActionState(
    seedDefaultMetricsAction,
    initialState,
  );
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <BarChart3 aria-hidden className="h-6 w-6" />
      </div>
      <p className="font-semibold">Sin métricas configuradas</p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
        Activa el conjunto de métricas predeterminadas para comenzar a registrar
        la evolución del alumno.
      </p>
      <StudentActionForm
        action={formAction}
        pending={pending}
        feedback={state}
        className="mt-5 flex flex-col items-center gap-2"
      >
        <input type="hidden" name="studentId" value={studentId} />
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          isLoading={pending}
          className="min-h-11 gap-2"
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
          {pending ? "Activando..." : "Activar métricas predeterminadas"}
        </Button>
      </StudentActionForm>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Paginated evaluation list — limits mounted nodes for long histories
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function EvaluationHistoryList({
  evaluations,
  definitions,
  defsMap,
  studentId,
}: {
  evaluations: MetricEvaluation[];
  definitions: MetricDefinition[];
  defsMap: Map<string, MetricDefinition>;
  studentId: string;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Sort descending by date once — not inside each row
  const sorted = useMemo(
    () =>
      [...evaluations].sort(
        (a, b) => b.evaluatedAt.getTime() - a.evaluatedAt.getTime(),
      ),
    [evaluations],
  );

  const visible = sorted.slice(0, visibleCount);
  const remaining = sorted.length - visibleCount;

  return (
    <>
      <ul className="space-y-2">
        {visible.map((evaluation) => (
          <EvaluationHistoryRow
            key={evaluation.id}
            evaluation={evaluation}
            definitions={definitions}
            defsMap={defsMap}
            studentId={studentId}
          />
        ))}
      </ul>
      {remaining > 0 ? (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="mt-3 w-full rounded-xl border border-white/8 py-2.5 text-sm text-muted-foreground transition-colors hover:border-white/15 hover:text-foreground"
        >
          Ver {Math.min(PAGE_SIZE, remaining)} más ({remaining} restante
          {remaining !== 1 ? "s" : ""})
        </button>
      ) : null}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────────────────────

type EvolutionView = "overview" | "history" | "new";

export function StudentEvolutionHistory({
  studentId,
  definitions,
  evaluations,
  todayStr,
}: {
  studentId: string;
  definitions: MetricDefinition[];
  evaluations: MetricEvaluation[];
  todayStr: string;
}) {
  const [activeView, setActiveView] = useState<EvolutionView>("overview");

  // ── KEY OPTIMISATION: build both lookup structures once per render.
  // defsMap  → O(1) slug lookups in every history row (replaces O(n) find)
  // evalsBySlug → each MetricSummaryCard gets only its own evaluations
  // Hooks must be called unconditionally — before any early return.
  const { defsMap, evalsBySlug } = useMemo(() => {
    const defsMap = new Map<string, MetricDefinition>(
      definitions.map((d) => [d.slug, d]),
    );

    const evalsBySlug = new Map<string, MetricEvaluation[]>();
    for (const def of definitions) {
      evalsBySlug.set(
        def.slug,
        evaluations.filter((e) => def.slug in e.values),
      );
    }

    return { defsMap, evalsBySlug };
  }, [definitions, evaluations]);

  if (definitions.length === 0) {
    return (
      <div className="space-y-5">
        <EmptySeedState studentId={studentId} />
        <CustomMetricForm studentId={studentId} />
      </div>
    );
  }

  // Stats
  const totalEvals = evaluations.length;
  const lastEval = evaluations.at(0);

  return (
    <div className="space-y-5">
      {/* Header stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-white/6 bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Total evaluaciones
          </p>
          <p className="metric-number mt-1.5 text-2xl font-bold">
            {totalEvals}
          </p>
        </article>
        <article className="rounded-2xl border border-white/6 bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Métricas activas
          </p>
          <p className="metric-number mt-1.5 text-2xl font-bold">
            {definitions.length}
          </p>
        </article>
        <article className="col-span-2 rounded-2xl border border-white/6 bg-card p-4 sm:col-span-1">
          <p className="text-xs font-medium text-muted-foreground">
            Última evaluación
          </p>
          <p className="metric-number mt-1.5 truncate text-sm font-bold">
            {lastEval ? DATE_FMT.format(lastEval.evaluatedAt) : "—"}
          </p>
        </article>
      </div>

      {/* View tabs */}
      <nav
        aria-label="Vistas de evolución"
        className="flex gap-2 overflow-x-auto pb-0.5"
      >
        {(
          [
            { key: "overview", label: "Resumen", Icon: BarChart3 },
            { key: "history", label: "Historial", Icon: Activity },
            { key: "new", label: "Nueva evaluación", Icon: Plus },
          ] as { key: EvolutionView; label: string; Icon: typeof Activity }[]
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveView(key)}
            aria-current={activeView === key ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
              activeView === key
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/8 bg-card text-muted-foreground hover:border-white/15"
            }`}
          >
            <Icon aria-hidden className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>

      {/* Overview: metric summary grid */}
      {activeView === "overview" ? (
        <div className="space-y-5">
          {(
            [
              "body_composition",
              "strength",
              "cardio",
              "custom",
            ] as MetricEvaluationType[]
          ).map((type) => {
            const defs = definitions.filter((d) => d.evaluationType === type);
            if (defs.length === 0) return null;
            const cfg = CATEGORY_CONFIG[type];
            const Icon = cfg.icon;
            return (
              <section key={type} aria-labelledby={`cat-${type}`}>
                <h3
                  id={`cat-${type}`}
                  className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  <Icon aria-hidden className={`h-3.5 w-3.5 ${cfg.accent}`} />
                  {cfg.label}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {defs.map((def) => (
                    <MetricSummaryCard
                      key={def.slug}
                      definition={def}
                      evaluations={evalsBySlug.get(def.slug) ?? []}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Add custom metric */}
          <CustomMetricForm studentId={studentId} />
        </div>
      ) : null}

      {/* History: evaluation list */}
      {activeView === "history" ? (
        <div className="space-y-3">
          {evaluations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-12 text-center">
              <Activity
                aria-hidden
                className="mb-3 h-8 w-8 text-muted-foreground/40"
              />
              <p className="text-sm font-medium text-muted-foreground">
                Sin evaluaciones registradas aún.
              </p>
            </div>
          ) : (
            <EvaluationHistoryList
              evaluations={evaluations}
              definitions={definitions}
              defsMap={defsMap}
              studentId={studentId}
            />
          )}
        </div>
      ) : null}

      {/* New evaluation */}
      {activeView === "new" ? (
        <NewEvaluationForm
          studentId={studentId}
          definitions={definitions}
          todayStr={todayStr}
        />
      ) : null}
    </div>
  );
}
