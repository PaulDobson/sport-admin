"use client";

import {
  useState,
  useCallback,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Maximize2,
  Play,
  Pause,
  Square,
  RotateCcw,
  Save,
  BookOpen,
  Trash2,
  Dumbbell,
  Coffee,
  Repeat2,
  Clock,
  Eye,
} from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import { StimulusSelector } from "./stimulus-selector";
import { saveExerciseAction, deleteExerciseAction } from "../actions";
import type { CognitiveExercise } from "@/domain/cognitive-training/cognitive-exercise";
import type {
  CognitiveSeriesConfig,
  CognitiveStatus,
  StimulusTimingConfig,
} from "./use-cognitive-timer";
import { clamp, phaseDuration } from "./use-cognitive-timer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExerciseConfigFormProps {
  seriesConfig: CognitiveSeriesConfig;
  stimulusTiming: StimulusTimingConfig;
  status: CognitiveStatus;
  isConfigDisabled: boolean;
  canStart: boolean;
  selectedIds: string[];
  savedExercises: CognitiveExercise[];
  currentExerciseId: string | null;

  onSetSeriesField: <K extends keyof CognitiveSeriesConfig>(
    key: K,
    value: CognitiveSeriesConfig[K],
  ) => void;
  onSetStimulusTimingField: <K extends keyof StimulusTimingConfig>(
    key: K,
    value: StimulusTimingConfig[K],
  ) => void;
  onSelectedIdsChange: (ids: string[]) => void;
  onLoadExercise: (exercise: CognitiveExercise) => void;
  onSetCurrentExerciseId: Dispatch<SetStateAction<string | null>>;
  onSetSavedExercises: Dispatch<SetStateAction<CognitiveExercise[]>>;

  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
}

// ─── CardShell ────────────────────────────────────────────────────────────────

function CardShell({
  icon: Icon,
  iconBg,
  title,
  badge,
  className,
  children,
}: {
  icon: typeof Dumbbell;
  iconBg: string;
  title: string;
  badge?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/10 ${className ?? ""}`}
    >
      <div className="mb-5 flex items-center gap-3">
        {/* Icon bubble — ligeramente más grande */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon aria-hidden="true" className="h-4.5 w-4.5" />
        </div>
        {/* Label más legible desde lejos */}
        <span className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </span>
        {badge && <div className="ml-auto">{badge}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Block ────────────────────────────────────────────────────────────────────

function Block({
  label,
  accent,
  children,
}: {
  label: string;
  accent: "default" | "primary" | "warning" | "violet" | "sky";
  children: React.ReactNode;
}) {
  const styles = {
    default: "border-border bg-surface-raised/60",
    primary: "border-primary/30 bg-primary/[0.07]",
    warning: "border-warning/30 bg-warning/[0.07]",
    violet: "border-violet-500/30 bg-violet-500/[0.07]",
    sky: "border-sky-500/30 bg-sky-500/[0.07]",
  };
  const labelStyles = {
    default: "text-muted-foreground",
    primary: "text-primary",
    warning: "text-warning",
    violet: "text-violet-400",
    sky: "text-sky-400",
  };

  return (
    <div
      className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 ${styles[accent]}`}
    >
      {/* Label más grande — legible desde el otro lado de la sala */}
      <span
        className={`text-[0.7rem] font-black uppercase tracking-[0.15em] ${labelStyles[accent]}`}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

// ─── TimeInput ────────────────────────────────────────────────────────────────

function TimeInput({
  unit,
  value,
  max,
  accent,
  onChange,
  disabled,
}: {
  unit: string;
  value: number;
  max: number;
  accent: "primary" | "warning";
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const color = accent === "primary" ? "text-primary" : "text-warning";
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground/70">
        {unit}
      </span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value), max))}
        className={`metric-number w-20 rounded-xl border border-input bg-background/40 px-1 py-3 text-center text-[2.6rem] font-black leading-none transition-colors focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 ${color}`}
      />
    </div>
  );
}

// ─── ConfigSection ────────────────────────────────────────────────────────────

function ConfigSection({
  title,
  accent,
  icon: Icon,
  minutes,
  seconds,
  onMinutesChange,
  onSecondsChange,
  disabled,
}: {
  title: string;
  accent: "primary" | "warning";
  icon: typeof Dumbbell;
  minutes: number;
  seconds: number;
  onMinutesChange: (v: number) => void;
  onSecondsChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <Block label={title} accent={accent}>
      <div
        className={`flex items-center gap-0.5 ${accent === "primary" ? "text-primary" : "text-warning"}`}
      >
        <Icon aria-hidden="true" className="h-3.5 w-3.5 opacity-70" />
      </div>
      <div className="flex items-end gap-1.5">
        <TimeInput
          unit="min"
          value={minutes}
          max={59}
          accent={accent}
          onChange={onMinutesChange}
          disabled={disabled}
        />
        <span className="metric-number mb-3 text-2xl font-black text-border">
          :
        </span>
        <TimeInput
          unit="seg"
          value={seconds}
          max={59}
          accent={accent}
          onChange={onSecondsChange}
          disabled={disabled}
        />
      </div>
    </Block>
  );
}

// ─── TimingBlock ──────────────────────────────────────────────────────────────

function TimingBlock({
  label,
  sublabel,
  accent,
  valueMs,
  minMs,
  maxMs,
  stepMs,
  onChange,
  disabled,
}: {
  label: string;
  sublabel: string;
  accent: "violet" | "sky";
  valueMs: number;
  minMs: number;
  maxMs: number;
  stepMs: number;
  onChange: (ms: number) => void;
  disabled: boolean;
}) {
  const valueSec = valueMs / 1000;
  const stepSec = stepMs / 1000;
  const minSec = minMs / 1000;
  const maxSec = maxMs / 1000;

  const decrement = () => onChange(Math.max(minMs, valueMs - stepMs));
  const increment = () => onChange(Math.min(maxMs, valueMs + stepMs));
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sec = parseFloat(e.target.value);
    if (Number.isNaN(sec)) return;
    onChange(Math.min(maxMs, Math.max(minMs, Math.round(sec * 1000))));
  };

  const valColor = accent === "violet" ? "text-violet-400" : "text-sky-400";
  const btnCls =
    accent === "violet"
      ? "border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
      : "border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20";

  return (
    <Block label={label} accent={accent}>
      {/* Value */}
      <div className="flex items-end gap-1">
        <input
          type="number"
          min={minSec}
          max={maxSec}
          step={stepSec}
          value={valueSec}
          disabled={disabled}
          onChange={handleChange}
          aria-label={`${label} en segundos`}
          className={`metric-number w-24 rounded-xl border border-input bg-background/40 px-1 py-3 text-center text-[2.6rem] font-black leading-none transition-colors focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 ${valColor}`}
        />
        <span className="mb-3.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground/70">
          seg
        </span>
      </div>

      {/* ± buttons — grandes y fáciles de pulsar */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || valueMs <= minMs}
          aria-label={`Reducir ${label}`}
          className={`flex h-11 w-14 items-center justify-center rounded-xl border text-xl font-black transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${btnCls}`}
        >
          −
        </button>
        <button
          type="button"
          onClick={increment}
          disabled={disabled || valueMs >= maxMs}
          aria-label={`Aumentar ${label}`}
          className={`flex h-11 w-14 items-center justify-center rounded-xl border text-xl font-black transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${btnCls}`}
        >
          +
        </button>
      </div>

      <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">
        {sublabel}
      </span>
    </Block>
  );
}

// ─── SavedExercisesList ───────────────────────────────────────────────────────

function SavedExercisesList({
  exercises,
  currentId,
  onLoad,
  onDelete,
}: {
  exercises: CognitiveExercise[];
  currentId: string | null;
  onLoad: (ex: CognitiveExercise) => void;
  onDelete: (id: string) => void;
}) {
  if (exercises.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Aún no hay ejercicios guardados.
      </p>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Ejercicios guardados">
      {exercises.map((ex) => {
        const isCurrent = ex.id === currentId;
        const workSecs =
          ex.config.seriesConfig.workMinutes * 60 +
          ex.config.seriesConfig.workSeconds;
        const mm = String(Math.floor(workSecs / 60)).padStart(2, "0");
        const ss = String(workSecs % 60).padStart(2, "0");

        return (
          <li
            key={ex.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
              isCurrent
                ? "border-primary/40 bg-primary/10"
                : "border-border bg-surface-raised/40 hover:bg-surface-raised"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-semibold ${isCurrent ? "text-primary" : "text-foreground"}`}
              >
                {ex.config.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ex.config.seriesConfig.totalSeries} series · {mm}:{ss} trabajo
                · {ex.config.selectedStimulusIds.length} estímulos
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onLoad(ex)}
                aria-label={`Cargar ejercicio ${ex.config.name}`}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-raised"
              >
                Cargar
              </button>
              <button
                type="button"
                onClick={() => onDelete(ex.id)}
                aria-label={`Eliminar ejercicio ${ex.config.name}`}
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-1.5 text-destructive transition-colors hover:bg-destructive/20"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Control buttons (shared between desktop and mobile layouts) ────────────

function ControlButtons({
  status,
  canStartWithStimuli,
  onStart,
  onPause,
  onResume,
  onStop,
  onRestart,
  buttonClassName,
}: {
  status: CognitiveStatus;
  canStartWithStimuli: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
  buttonClassName: string;
}) {
  return (
    <>
      {(status === "idle" || status === "done") && (
        <Button
          variant="primary"
          onClick={onStart}
          disabled={!canStartWithStimuli}
          className={`${buttonClassName} gap-2`}
          aria-label="Iniciar ejercicio cognitivo en pantalla completa"
        >
          <Maximize2 aria-hidden="true" className="h-5 w-5" />
          Iniciar ejercicio
        </Button>
      )}
      {status === "paused" && (
        <>
          <Button
            variant="primary"
            onClick={onStart}
            className={`${buttonClassName} gap-2`}
            aria-label="Proyectar en pantalla completa"
          >
            <Maximize2 aria-hidden="true" className="h-5 w-5" />
            Proyectar
          </Button>
          <Button
            variant="secondary"
            onClick={onResume}
            className={`${buttonClassName} gap-2`}
            aria-label="Reanudar ejercicio"
          >
            <Play aria-hidden="true" className="h-5 w-5 fill-current" />
            Reanudar
          </Button>
        </>
      )}
      {status === "running" && (
        <Button
          variant="secondary"
          onClick={onPause}
          className={`${buttonClassName} gap-2`}
          aria-label="Pausar ejercicio"
        >
          <Pause aria-hidden="true" className="h-5 w-5 fill-current" />
          Pausar
        </Button>
      )}
      {status !== "idle" && (
        <Button
          variant="danger"
          onClick={status === "done" ? onRestart : onStop}
          className={`${buttonClassName} gap-2`}
          aria-label={
            status === "done" ? "Reiniciar ejercicio" : "Detener ejercicio"
          }
        >
          {status === "done" ? (
            <>
              <RotateCcw aria-hidden="true" className="h-5 w-5" />
              Reiniciar
            </>
          ) : (
            <>
              <Square aria-hidden="true" className="h-5 w-5 fill-current" />
              Detener
            </>
          )}
        </Button>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExerciseConfigForm({
  seriesConfig,
  stimulusTiming,
  status,
  isConfigDisabled,
  canStart,
  selectedIds,
  savedExercises,
  currentExerciseId,
  onSetSeriesField,
  onSetStimulusTimingField,
  onSelectedIdsChange,
  onLoadExercise,
  onSetCurrentExerciseId,
  onSetSavedExercises,
  onStart,
  onPause,
  onResume,
  onStop,
  onRestart,
}: ExerciseConfigFormProps) {
  const [exerciseName, setExerciseName] = useState("Mi ejercicio cognitivo");
  const [showSaved, setShowSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canStartWithStimuli = canStart && selectedIds.length > 0;

  // Work-time label for the mobile sticky bar summary
  const workSecs = phaseDuration(seriesConfig, "work");
  const workTimeLabel = `${Math.floor(workSecs / 60)}:${String(workSecs % 60).padStart(2, "0")}`;

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    setSaveError(null);
    setSaveSuccess(false);
    startTransition(async () => {
      const result = await saveExerciseAction(currentExerciseId, {
        name: exerciseName.trim() || "Ejercicio sin nombre",
        seriesConfig,
        stimulusTiming,
        selectedStimulusIds: selectedIds,
      });
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (result.exercise) {
        onSetCurrentExerciseId(result.exercise.id);
        onSetSavedExercises((prev) => {
          const exists = prev.find((e) => e.id === result.exercise!.id);
          if (exists)
            return prev.map((e) =>
              e.id === result.exercise!.id ? result.exercise! : e,
            );
          return [result.exercise!, ...prev];
        });
      }
    });
  }, [
    currentExerciseId,
    exerciseName,
    seriesConfig,
    stimulusTiming,
    selectedIds,
    onSetCurrentExerciseId,
    onSetSavedExercises,
  ]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await deleteExerciseAction(id);
        if (result.error) {
          setSaveError(result.error);
          return;
        }
        onSetSavedExercises((prev) => prev.filter((e) => e.id !== id));
        if (currentExerciseId === id) onSetCurrentExerciseId(null);
      });
    },
    [currentExerciseId, onSetCurrentExerciseId, onSetSavedExercises],
  );

  // ── Load ───────────────────────────────────────────────────────────────────
  const handleLoad = useCallback(
    (ex: CognitiveExercise) => {
      onLoadExercise(ex);
      setExerciseName(ex.config.name);
      onSetCurrentExerciseId(ex.id);
      setShowSaved(false);
    },
    [onLoadExercise, onSetCurrentExerciseId],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* ── Nombre + guardar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <label
            htmlFor="exercise-name"
            className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground"
          >
            Nombre del ejercicio
          </label>
          {/* Input más alto — fácil de leer y tocar */}
          <input
            id="exercise-name"
            type="text"
            maxLength={80}
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            disabled={isConfigDisabled}
            placeholder="Ej. Reacción rápida colores"
            className="h-13 w-full rounded-xl border border-input bg-surface-raised/60 px-4 text-base font-semibold text-foreground transition-colors placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
          />
        </div>
        {/* Botones de acción con altura táctil generosa */}
        <Button
          variant="secondary"
          onClick={handleSave}
          disabled={isConfigDisabled || isPending}
          isLoading={isPending}
          className="h-13 shrink-0 gap-2 px-5 text-sm"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {currentExerciseId ? "Actualizar" : "Guardar"}
        </Button>
        <Button
          variant="quiet"
          onClick={() => setShowSaved((v) => !v)}
          className="h-13 shrink-0 gap-2 px-5 text-sm"
          aria-expanded={showSaved}
          aria-controls="saved-exercises-panel"
        >
          <BookOpen aria-hidden="true" className="h-4 w-4" />
          Guardados ({savedExercises.length})
        </Button>
      </div>

      {saveError && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {saveError}
        </p>
      )}
      {saveSuccess && (
        <p role="status" className="text-sm font-semibold text-success">
          ✓ Ejercicio guardado correctamente.
        </p>
      )}

      {showSaved && (
        <div
          id="saved-exercises-panel"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
            Ejercicios guardados
          </p>
          <SavedExercisesList
            exercises={savedExercises}
            currentId={currentExerciseId}
            onLoad={handleLoad}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* ── Dos cards en fila ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        {/* Card 1 — Series de trabajo */}
        <CardShell
          icon={Repeat2}
          iconBg="bg-primary/15 text-primary"
          title="Series de trabajo"
          className="flex-1"
        >
          <div className="flex flex-wrap justify-center gap-3">
            {/* Series count — número grande */}
            <Block label="Series" accent="default">
              <input
                type="number"
                min={1}
                max={20}
                value={seriesConfig.totalSeries}
                disabled={isConfigDisabled}
                onChange={(e) =>
                  onSetSeriesField(
                    "totalSeries",
                    clamp(Number(e.target.value), 20),
                  )
                }
                className="metric-number w-20 rounded-xl border border-input bg-background/40 px-1 py-3 text-center text-[2.6rem] font-black leading-none text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
              />
            </Block>

            <ConfigSection
              title="Trabajo"
              accent="primary"
              icon={Dumbbell}
              minutes={seriesConfig.workMinutes}
              seconds={seriesConfig.workSeconds}
              onMinutesChange={(v) => onSetSeriesField("workMinutes", v)}
              onSecondsChange={(v) => onSetSeriesField("workSeconds", v)}
              disabled={isConfigDisabled}
            />

            <ConfigSection
              title="Descanso"
              accent="warning"
              icon={Coffee}
              minutes={seriesConfig.restMinutes}
              seconds={seriesConfig.restSeconds}
              onMinutesChange={(v) => onSetSeriesField("restMinutes", v)}
              onSecondsChange={(v) => onSetSeriesField("restSeconds", v)}
              disabled={isConfigDisabled}
            />
          </div>
        </CardShell>

        {/* Card 2 — Tiempo de estímulos */}
        <CardShell
          icon={Clock}
          iconBg="bg-violet-500/15 text-violet-400"
          title="Tiempo de estímulos"
        >
          <div className="flex flex-wrap justify-center gap-3">
            <TimingBlock
              label="Duración"
              sublabel="del estímulo"
              accent="violet"
              valueMs={stimulusTiming.displayDurationMs}
              minMs={200}
              maxMs={5000}
              stepMs={100}
              onChange={(v) => onSetStimulusTimingField("displayDurationMs", v)}
              disabled={isConfigDisabled}
            />
            <TimingBlock
              label="Intervalo"
              sublabel="entre estímulos"
              accent="sky"
              valueMs={stimulusTiming.gapDurationMs}
              minMs={0}
              maxMs={3000}
              stepMs={100}
              onChange={(v) => onSetStimulusTimingField("gapDurationMs", v)}
              disabled={isConfigDisabled}
            />
          </div>
          <p className="mt-4 border-t border-border pt-3 text-center text-sm text-muted-foreground">
            Cada{" "}
            <span className="font-bold text-foreground">
              {(
                (stimulusTiming.displayDurationMs +
                  stimulusTiming.gapDurationMs) /
                1000
              ).toFixed(1)}
              s
            </span>
            {" · "}visible{" "}
            <span className="font-bold text-foreground">
              {(stimulusTiming.displayDurationMs / 1000).toFixed(1)}s
            </span>
          </p>
        </CardShell>
      </div>

      {/* ── Estímulos ─────────────────────────────────────────────────────── */}
      <CardShell
        icon={Eye}
        iconBg="bg-violet-500/15 text-violet-400"
        title="Estímulos visuales"
        badge={
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              selectedIds.length > 0
                ? "bg-primary/15 text-primary"
                : "bg-muted/30 text-muted-foreground"
            }`}
          >
            {selectedIds.length} seleccionados
          </span>
        }
      >
        <StimulusSelector
          selectedIds={selectedIds}
          onChange={onSelectedIdsChange}
          disabled={isConfigDisabled}
        />
      </CardShell>

      {/* ── Controles ─────────────────────────────────────────────────── */}
      {/* Desktop (sm+): botones al pie del formulario */}
      <div className="hidden flex-wrap items-center justify-center gap-4 pt-2 sm:flex">
        <ControlButtons
          status={status}
          canStartWithStimuli={canStartWithStimuli}
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          onRestart={onRestart}
          buttonClassName="h-14 min-w-52 text-base font-bold"
        />
      </div>

      {!canStartWithStimuli && status === "idle" && (
        <p className="hidden text-center text-sm text-muted-foreground sm:block">
          {phaseDuration(seriesConfig, "work") === 0
            ? "Define un tiempo de trabajo para iniciar."
            : "Selecciona al menos un estímulo para iniciar."}
        </p>
      )}

      {/* Mobile (< sm): sticky action bar — siempre visible durante el scroll */}
      <div className="sticky bottom-0 z-10 border-t border-border/50 bg-card/95 py-3 backdrop-blur-md sm:hidden">
        {/* Resumen de configuración */}
        {canStartWithStimuli && (status === "idle" || status === "done") && (
          <div className="mb-2.5 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
            <span>
              <strong className="text-foreground">{selectedIds.length}</strong>{" "}
              estímulos
            </span>
            <span className="text-border">·</span>
            <span>
              <strong className="text-foreground">
                {seriesConfig.totalSeries}
              </strong>{" "}
              series
            </span>
            <span className="text-border">·</span>
            <span>
              <strong className="text-foreground">{workTimeLabel}</strong>{" "}
              trabajo
            </span>
          </div>
        )}
        {/* Mensaje de validación */}
        {!canStartWithStimuli && status === "idle" && (
          <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">
            {phaseDuration(seriesConfig, "work") === 0
              ? "Define un tiempo de trabajo para iniciar."
              : "Selecciona al menos un estímulo."}
          </p>
        )}
        {/* Botones */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ControlButtons
            status={status}
            canStartWithStimuli={canStartWithStimuli}
            onStart={onStart}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
            onRestart={onRestart}
            buttonClassName="h-12 min-w-40 text-sm font-bold"
          />
        </div>
      </div>
    </div>
  );
}
