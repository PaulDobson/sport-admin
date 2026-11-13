"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info,
  Save,
} from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  computeOneRm,
  buildOneRmPercentageTable,
  computeWorkWeightPercentage,
  getEfcOneRmRecommendation,
  rpeToRir,
  ONE_RM_EXERCISES,
  EFC_PERIOD_LABELS,
} from "@/domain/efc-training";
import type {
  OneRmResult,
  OneRmPercentageRow,
  OneRmEfcRecommendation,
  EfcPeriod,
  EfcOneRmRecord,
} from "@/domain/efc-training";
import { saveOneRmAction } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  /** Set when navigated from an athlete context. Enables the save button. */
  athleteId: string | null;
  /** EFC period assigned to the athlete; enables the recommendations block. */
  efcPeriod: EfcPeriod | null;
  /** Recent 1RM records for context; shown in a history list. */
  recentOneRms: EfcOneRmRecord[];
}

// ─── Period badge styles ──────────────────────────────────────────────────────

const PERIOD_STYLES: Record<EfcPeriod, string> = {
  E: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  F: "border-green-500/40 bg-green-500/10 text-green-300",
  C: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

// ─── KaTeX formula strings ────────────────────────────────────────────────────

const EPLEY_LATEX =
  "1RM_{Epley} = W \\times \\left(1 + \\frac{n}{30}\\right)";
const BRZYCKI_LATEX =
  "1RM_{Brzycki} = W \\times \\frac{36}{37 - n}";

function renderLatex(latex: string): string {
  return katex.renderToString(latex, {
    displayMode: true,
    throwOnError: false,
  });
}

// ─── OneRmCalculatorClient ────────────────────────────────────────────────────

export function OneRmCalculatorClient({
  athleteId,
  efcPeriod,
  recentOneRms,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // ── Form fields ───────────────────────────────────────────────────────────
  const [exercise, setExercise] = useState<string>(ONE_RM_EXERCISES[0].value);
  const [weight, setWeight] = useState<string>("");
  const [reps, setReps] = useState<string>("");
  const [rir, setRir] = useState<string>("0");
  const [rpe, setRpe] = useState<string>("");
  const [workWeight, setWorkWeight] = useState<string>("");
  const [evaluationDate, setEvaluationDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  // ── Save result ───────────────────────────────────────────────────────────
  const [saveResult, setSaveResult] = useState<
    | { success: true; id: string; recommendation: OneRmEfcRecommendation | null }
    | { success: false; error: string }
    | null
  >(null);

  // ── Derived / computed values ─────────────────────────────────────────────
  // Auto-compute RIR from RPE when RPE is provided
  const rpeValue = rpe.trim() !== "" ? parseFloat(rpe) : null;
  const effectiveRir =
    rpeValue !== null && !isNaN(rpeValue)
      ? rpeToRir(Math.min(10, Math.max(0, rpeValue)))
      : parseInt(rir, 10);

  const weightValue = parseFloat(weight);
  const repsValue = parseInt(reps, 10);

  // Synchronous 1RM calculation — runs on every render (no debounce needed)
  let oneRmResult: OneRmResult | null = null;
  let percentageTable: OneRmPercentageRow[] = [];
  let workWeightPct: number | null = null;
  let calcError: string | null = null;

  if (
    weight.trim() !== "" &&
    reps.trim() !== "" &&
    !isNaN(weightValue) &&
    !isNaN(repsValue) &&
    !isNaN(effectiveRir) &&
    weightValue > 0 &&
    repsValue >= 1 &&
    effectiveRir >= 0
  ) {
    try {
      oneRmResult = computeOneRm({
        weightKg: weightValue,
        repsPerformed: repsValue,
        rir: effectiveRir,
      });
      percentageTable = buildOneRmPercentageTable(oneRmResult.average);

      const ww = parseFloat(workWeight);
      if (workWeight.trim() !== "" && !isNaN(ww) && ww > 0) {
        workWeightPct = computeWorkWeightPercentage(ww, oneRmResult.average);
      }
    } catch (err) {
      calcError =
        err instanceof Error ? err.message : "Error en el cálculo.";
    }
  }

  // EFC recommendations: only when in integrated mode (efcPeriod provided)
  let efcRecommendation: OneRmEfcRecommendation | null = null;
  if (efcPeriod && oneRmResult) {
    try {
      efcRecommendation = getEfcOneRmRecommendation(
        efcPeriod,
        oneRmResult.average,
      );
    } catch {
      // Silently ignore — recommendation is non-critical
    }
  }

  // Find the row in the table closest to the work weight percentage
  const highlightedRow =
    workWeightPct !== null && percentageTable.length > 0
      ? percentageTable.reduce((closest, row) =>
          Math.abs(row.percentage - workWeightPct!) <
          Math.abs(closest.percentage - workWeightPct!)
            ? row
            : closest,
        )
      : null;

  // ── Save handler ──────────────────────────────────────────────────────────
  function handleSave() {
    if (!athleteId || !oneRmResult) return;
    setSaveResult(null);

    const fd = new FormData();
    fd.set("athleteId", athleteId);
    fd.set("exercise", exercise);
    fd.set("weightKg", String(weightValue));
    fd.set("repsPerformed", String(repsValue));
    fd.set("rir", String(effectiveRir));
    if (rpeValue !== null) fd.set("rpe", String(rpeValue));
    fd.set("evaluationDate", evaluationDate);

    startTransition(async () => {
      const result = await saveOneRmAction(fd);
      setSaveResult(result);
    });
  }

  // ── Field change clears save result ──────────────────────────────────────
  function clearSave() {
    setSaveResult(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* ── Input grid ──────────────────────────────────────────────────── */}
      <section aria-label="Parámetros del levantamiento">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Parámetros del levantamiento
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Exercise */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="exercise"
              className="text-sm font-medium"
            >
              Ejercicio
            </label>
            <select
              id="exercise"
              value={exercise}
              onChange={(e) => {
                setExercise(e.target.value);
                clearSave();
              }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            >
              {ONE_RM_EXERCISES.map((ex) => (
                <option key={ex.value} value={ex.value}>
                  {ex.label}
                </option>
              ))}
            </select>
          </div>

          {/* Weight lifted */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="weight" className="text-sm font-medium">
              Peso levantado (kg)
            </label>
            <input
              id="weight"
              type="number"
              min={0.1}
              max={999.9}
              step={0.5}
              placeholder="ej. 85"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                clearSave();
              }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>

          {/* Reps performed */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reps" className="text-sm font-medium">
              Repeticiones realizadas
            </label>
            <input
              id="reps"
              type="number"
              min={1}
              max={30}
              step={1}
              placeholder="ej. 5"
              value={reps}
              onChange={(e) => {
                setReps(e.target.value);
                clearSave();
              }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>

          {/* RPE (optional) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rpe" className="text-sm font-medium">
              RPE{" "}
              <span className="font-normal text-muted-foreground">
                (opcional, 6–10)
              </span>
            </label>
            <input
              id="rpe"
              type="number"
              min={6}
              max={10}
              step={0.5}
              placeholder="ej. 8.5"
              value={rpe}
              onChange={(e) => {
                setRpe(e.target.value);
                clearSave();
              }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>

          {/* RIR */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rir" className="text-sm font-medium">
              RIR{" "}
              {rpeValue !== null && !isNaN(rpeValue) && (
                <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
                  Auto ({effectiveRir})
                </span>
              )}
            </label>
            <input
              id="rir"
              type="number"
              min={0}
              max={5}
              step={1}
              value={
                rpeValue !== null && !isNaN(rpeValue)
                  ? String(effectiveRir)
                  : rir
              }
              disabled={rpeValue !== null && !isNaN(rpeValue)}
              onChange={(e) => {
                setRir(e.target.value);
                clearSave();
              }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Work weight (optional) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="workWeight" className="text-sm font-medium">
              Peso de trabajo (kg){" "}
              <span className="font-normal text-muted-foreground">
                (opcional, para %1RM)
              </span>
            </label>
            <input
              id="workWeight"
              type="number"
              min={0.1}
              max={999.9}
              step={0.5}
              placeholder="ej. 72.5"
              value={workWeight}
              onChange={(e) => {
                setWorkWeight(e.target.value);
                clearSave();
              }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>
        </div>
      </section>

      {/* ── Calculation error ────────────────────────────────────────────── */}
      {calcError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{calcError}</span>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {oneRmResult && !calcError && (
        <section aria-label="Resultados 1RM" className="space-y-6">
          {/* Unreliable warning */}
          {oneRmResult.unreliableWarning && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                Estimación poco confiable por encima de 30 repeticiones totales
                ({oneRmResult.repsTotal} reps totales).
              </span>
            </div>
          )}

          {/* Main 1RM result card */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Resultado 1RM
              </h2>
              {workWeightPct !== null && (
                <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-sm font-semibold text-primary">
                  {workWeightPct.toFixed(1)}% del 1RM
                </span>
              )}
            </div>

            {/* Primary: average */}
            <div className="mb-5 text-center">
              <p className="text-xs text-muted-foreground">Promedio (Epley + Brzycki)</p>
              <p className="text-5xl font-bold tabular-nums tracking-tight">
                {oneRmResult.average.toFixed(1)}
                <span className="ml-1 text-2xl font-normal text-muted-foreground">
                  kg
                </span>
              </p>
            </div>

            {/* Secondary: individual estimates */}
            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Epley</p>
                <p className="text-lg font-semibold tabular-nums">
                  {oneRmResult.epley.toFixed(1)} kg
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Brzycki</p>
                <p className="text-lg font-semibold tabular-nums">
                  {oneRmResult.brzycki !== null
                    ? `${oneRmResult.brzycki.toFixed(1)} kg`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Detail row */}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Peso: {weightValue} kg · Reps: {repsValue} · RIR: {effectiveRir} · Total reps: {oneRmResult.repsTotal}
            </p>
          </div>

          {/* ── KaTeX formulas ────────────────────────────────────────── */}
          <details className="rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer select-none items-center gap-2 px-5 py-3 text-sm font-medium hover:bg-white/4">
              <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Ver fórmulas utilizadas
            </summary>
            <div className="border-t border-border px-5 py-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Donde <strong>W</strong> = peso levantado y{" "}
                <strong>n</strong> = repeticiones totales (reps + RIR).
              </p>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Epley (1985)
                </p>
                <div
                  className="overflow-x-auto"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: renderLatex(EPLEY_LATEX),
                  }}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Brzycki (1993)
                </p>
                <div
                  className="overflow-x-auto"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: renderLatex(BRZYCKI_LATEX),
                  }}
                />
              </div>
            </div>
          </details>

          {/* ── Percentage table (task 10.3) ──────────────────────────── */}
          <section
            aria-label="Tabla de porcentajes del 1RM"
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">
                Tabla de porcentajes del 1RM
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      % 1RM
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Peso (kg)
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Reps al fallo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {percentageTable.map((row) => {
                    const isHighlighted =
                      highlightedRow?.percentage === row.percentage;
                    return (
                      <tr
                        key={row.percentage}
                        className={
                          isHighlighted
                            ? "bg-primary/15 font-semibold ring-1 ring-inset ring-primary/30"
                            : "border-b border-border/50 last:border-0 even:bg-muted/10"
                        }
                        aria-current={isHighlighted ? "true" : undefined}
                      >
                        <td className="px-4 py-2 tabular-nums">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              isHighlighted
                                ? "bg-primary/20 text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            {row.percentage}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {row.weightKg.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {row.repsToFailure === 30 ? "≥ 30" : row.repsToFailure}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── EFC Recommendations (task 10.3, integrated mode only) ─── */}
          {efcPeriod && efcRecommendation && (
            <section
              aria-label={`Recomendaciones EFC período ${EFC_PERIOD_LABELS[efcPeriod]}`}
              className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  Recomendaciones para{" "}
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PERIOD_STYLES[efcPeriod]}`}
                  >
                    {efcPeriod} — {EFC_PERIOD_LABELS[efcPeriod]}
                  </span>
                </h2>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">
                    Intensidad (%1RM)
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {efcRecommendation.percentageMin}–
                    {efcRecommendation.percentageMax}%
                  </dd>
                </div>

                <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">
                    Rango de peso (kg)
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">
                    {efcRecommendation.weightMin.toFixed(1)}–
                    {efcRecommendation.weightMax.toFixed(1)} kg
                  </dd>
                </div>

                <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">
                    Series × Reps
                  </dt>
                  <dd className="mt-0.5 font-semibold">
                    {efcRecommendation.seriesRange} ×{" "}
                    {efcRecommendation.repsRange}
                  </dd>
                </div>

                <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">RIR</dt>
                  <dd className="mt-0.5 font-semibold">
                    {efcRecommendation.rirRange}
                  </dd>
                </div>

                <div className="col-span-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Foco</dt>
                  <dd className="mt-0.5 font-medium">
                    {efcRecommendation.focus}
                  </dd>
                </div>
              </dl>

              <p className="text-xs text-muted-foreground">
                <Info
                  className="mr-1 inline h-3.5 w-3.5"
                  aria-hidden="true"
                />
                Estos valores son orientativos. Ajustar según historial, técnica
                y respuesta del deportista.
              </p>
            </section>
          )}

          {/* ── Save block (only in athlete context) ─────────────────── */}
          {athleteId && (
            <section
              aria-label="Guardar registro"
              className="rounded-xl border border-border bg-card p-5 space-y-4"
            >
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Guardar registro
              </h2>

              <div className="flex flex-col gap-1.5 sm:max-w-xs">
                <label
                  htmlFor="evaluationDate"
                  className="text-sm font-medium"
                >
                  Fecha de evaluación
                </label>
                <input
                  id="evaluationDate"
                  type="date"
                  value={evaluationDate}
                  onChange={(e) => {
                    setEvaluationDate(e.target.value);
                    clearSave();
                  }}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending || !oneRmResult}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Guardando…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Guardar 1RM
                    </>
                  )}
                </button>

                {saveResult?.success === true && (
                  <span
                    role="status"
                    className="flex items-center gap-1.5 text-sm text-green-400"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Guardado correctamente
                  </span>
                )}

                {saveResult?.success === false && (
                  <span
                    role="alert"
                    className="flex items-center gap-1.5 text-sm text-destructive"
                  >
                    <AlertTriangle
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    {saveResult.error}
                  </span>
                )}
              </div>

              {/* Post-save recommendation from server */}
              {saveResult?.success === true &&
                saveResult.recommendation && (
                  <div
                    role="status"
                    aria-label="Recomendación guardada"
                    className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm"
                  >
                    <p className="mb-1 font-medium text-green-400">
                      Recomendación para{" "}
                      {EFC_PERIOD_LABELS[saveResult.recommendation.period]}
                    </p>
                    <p className="text-muted-foreground">
                      {saveResult.recommendation.percentageMin}–
                      {saveResult.recommendation.percentageMax}% · {" "}
                      {saveResult.recommendation.weightMin.toFixed(1)}–
                      {saveResult.recommendation.weightMax.toFixed(1)} kg · {" "}
                      {saveResult.recommendation.seriesRange} ×{" "}
                      {saveResult.recommendation.repsRange} · RIR{" "}
                      {saveResult.recommendation.rirRange}
                    </p>
                  </div>
                )}
            </section>
          )}
        </section>
      )}

      {/* ── Empty state: no inputs yet ───────────────────────────────────── */}
      {!oneRmResult && !calcError && (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
          <Info className="h-8 w-8 opacity-40" aria-hidden="true" />
          <p className="text-sm">
            Introduce el peso, las repeticiones y el RIR para ver el 1RM
            estimado.
          </p>
        </div>
      )}

      {/* ── Recent records ────────────────────────────────────────────────── */}
      {recentOneRms.length > 0 && (
        <section
          aria-label="Registros recientes"
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">Registros recientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Fecha
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Ejercicio
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Peso
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    1RM prom.
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOneRms.slice(0, 10).map((r) => {
                  const exerciseLabel =
                    ONE_RM_EXERCISES.find((ex) => ex.value === r.exercise)
                      ?.label ?? r.exercise;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/50 last:border-0 even:bg-muted/10"
                    >
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {r.evaluationDate}
                      </td>
                      <td className="px-4 py-2">{exerciseLabel}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {r.weightKg} kg × {r.repsPerformed} @ RIR {r.rir}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">
                        {r.oneRmAverage.toFixed(1)} kg
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
