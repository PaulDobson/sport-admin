"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Coffee,
  Maximize2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import { useFullscreen } from "./use-fullscreen";
import { FullscreenDisplay } from "./fullscreen-display";
import type { FullscreenTone } from "./fullscreen-display";
import { usePrepare } from "./use-prepare";
import { useTimerSound } from "./use-timer-sound";
import {
  useSidebarCollapsed,
  useSidebarToggle,
} from "@/presentation/components/app-shell";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "work" | "rest";
type Status = "idle" | "running" | "paused" | "done";
type Direction = "ascending" | "descending";

interface PyramidConfig {
  /** Número de "pisos" en la subida (sin contar el pico). Ej: 3 → 1, 2, 3 pisos. */
  floors: number;
  /** Incremento de segundos por piso. Ej: 10 → 10s, 20s, 30s. */
  stepSeconds: number;
  /** Segundos de descanso entre cada paso. */
  restSeconds: number;
}

interface RuntimeState {
  /** Índice 0-based del paso actual en la secuencia completa. */
  stepIndex: number;
  phase: Phase;
  remaining: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTime(totalSeconds: number): { mm: string; ss: string } {
  const s = Math.max(0, totalSeconds);
  return { mm: pad(Math.floor(s / 60)), ss: pad(s % 60) };
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || value < min) return min;
  return Math.min(value, max);
}

/**
 * Construye la secuencia completa de duraciones de trabajo (en segundos).
 * Ejemplo: floors=3, stepSeconds=10 → [10, 20, 30, 20, 10]
 */
function buildSequence(floors: number, stepSeconds: number): number[] {
  if (floors <= 0 || stepSeconds <= 0) return [];
  const ascending = Array.from(
    { length: floors },
    (_, i) => (i + 1) * stepSeconds,
  );
  const descending = ascending.slice(0, -1).reverse();
  return [...ascending, ...descending];
}

function initialRuntime(floors: number, stepSeconds: number): RuntimeState {
  return {
    stepIndex: 0,
    phase: "work",
    remaining: stepSeconds,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Indicador de fase y paso actual */
function PhaseIndicator({
  phase,
  stepIndex,
  sequence,
  direction,
  status,
}: {
  phase: Phase;
  stepIndex: number;
  sequence: number[];
  direction: Direction;
  status: Status;
}) {
  if (status === "idle") return null;

  const isWork = phase === "work";
  const bgClass = isWork
    ? "border-info/30 bg-info/10 text-info"
    : "border-warning/30 bg-warning/10 text-warning";
  const Icon = isWork
    ? direction === "ascending"
      ? TrendingUp
      : TrendingDown
    : Coffee;
  const label = isWork
    ? direction === "ascending"
      ? "Subiendo"
      : "Bajando"
    : "Descanso";

  const currentStep = Math.floor(stepIndex / 2) + (phase === "rest" ? 0 : 0);
  const totalSteps = sequence.length;

  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all duration-500 ${
          status === "done"
            ? "border-success/30 bg-success/10 text-success"
            : bgClass
        }`}
      >
        {status === "done" ? (
          "¡Completado!"
        ) : (
          <>
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
          </>
        )}
      </span>
      {status !== "done" && (
        <span className="metric-number text-sm font-bold text-muted-foreground">
          Paso {stepIndex + 1} / {totalSteps}
        </span>
      )}
    </div>
  );
}

/**
 * Visualización piramidal de los pasos: barras verticales proporcionales
 * que muestran la forma de la pirámide con el paso activo resaltado.
 */
function PyramidVisual({
  sequence,
  stepIndex,
  phase,
  status,
}: {
  sequence: number[];
  stepIndex: number;
  phase: Phase;
  status: Status;
}) {
  if (sequence.length === 0 || status === "idle") return null;

  const maxVal = Math.max(...sequence);

  return (
    <div
      aria-label={`Visualización de la pirámide: paso ${stepIndex + 1} de ${sequence.length}`}
      className="flex w-full max-w-xs items-end justify-center gap-1"
      style={{ height: "2.5rem" }}
    >
      {sequence.map((val, i) => {
        const heightPercent = maxVal > 0 ? (val / maxVal) * 100 : 0;
        const isActive = i === stepIndex && phase === "work";
        const isDone =
          status === "done" ||
          i < stepIndex ||
          (i === stepIndex && phase === "rest");

        return (
          <div
            key={i}
            aria-hidden="true"
            className={`flex-1 rounded-t-sm transition-all duration-500 ${
              status === "done"
                ? "bg-success/60"
                : isActive
                  ? "bg-info"
                  : isDone
                    ? "bg-info/40"
                    : "bg-muted"
            }`}
            style={{ height: `${heightPercent}%` }}
          />
        );
      })}
    </div>
  );
}

/** Input numérico con etiqueta, reutilizable */
function NumberInput({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  unit?: string;
}) {
  return (
    <label className="flex flex-col items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
        className="metric-number w-24 rounded-2xl border border-input bg-background/50 px-2 py-4 text-center text-4xl font-bold text-foreground transition-colors focus-visible:border-info focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
      />
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </label>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PyramidTimer() {
  // ── Config ─────────────────────────────────────────────────────────────────
  const [config, setConfig] = useState<PyramidConfig>({
    floors: 3,
    stepSeconds: 10,
    restSeconds: 10,
  });

  // ── Sequence derivada ──────────────────────────────────────────────────────
  // Se recalcula solo cuando cambia floors o stepSeconds
  const sequence = useMemo(
    () => buildSequence(config.floors, config.stepSeconds),
    [config.floors, config.stepSeconds],
  );

  // ── Runtime ────────────────────────────────────────────────────────────────
  const [runtime, setRuntime] = useState<RuntimeState>(() =>
    initialRuntime(config.floors, config.stepSeconds),
  );
  const [status, setStatus] = useState<Status>("idle");

  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRuntimeRef = useRef<RuntimeState | null>(null);
  const newStepAlertedRef = useRef(false);

  // Refs estables para closures del interval
  const runtimeRef = useRef<RuntimeState>(runtime);
  useEffect(() => {
    runtimeRef.current = runtime;
  });
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });
  const sequenceRef = useRef(sequence);
  useEffect(() => {
    sequenceRef.current = sequence;
  });

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const {
    isFullscreen,
    enter: enterFullscreen,
    exit: exitFullscreen,
    ref: fsRef,
  } = useFullscreen();

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebarCollapsed = useSidebarCollapsed();
  const sidebarToggle = useSidebarToggle();
  const didCollapseSidebarRef = useRef(false);

  // ── Sound ──────────────────────────────────────────────────────────────────
  const { playWork, playRest, playDone, preload, playBeep, playNewSeries } =
    useTimerSound();
  const soundRef = useRef({ playWork, playRest, playDone, playNewSeries });
  useEffect(() => {
    soundRef.current = { playWork, playRest, playDone, playNewSeries };
  }, [playWork, playRest, playDone, playNewSeries]);

  // ── Preparation countdown ──────────────────────────────────────────────────
  const { isPreparing, prepareSecondsLeft, startPrepare, cancelPrepare } =
    usePrepare({ preload, playBeep });

  // ── Tick ───────────────────────────────────────────────────────────────────

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTick(), [clearTick]);

  // Al completar la secuencia, salir de pantalla completa y restaurar sidebar
  useEffect(() => {
    if (status !== "done") return;
    exitFullscreen();
    if (didCollapseSidebarRef.current) {
      sidebarToggle();
      didCollapseSidebarRef.current = false;
    }
    const t = setTimeout(() => {
      setRuntime(initialRuntime(config.floors, config.stepSeconds));
      setStatus("idle");
    }, 600);
    return () => clearTimeout(t);
  }, [
    status,
    exitFullscreen,
    sidebarToggle,
    config.floors,
    config.stepSeconds,
  ]);

  // Sincronizar runtime al cambiar config mientras está en idle
  const [prevConfig, setPrevConfig] = useState(config);
  if (status === "idle" && prevConfig !== config) {
    setPrevConfig(config);
    setRuntime(initialRuntime(config.floors, config.stepSeconds));
  }

  const startTick = useCallback(
    (fromRuntime: RuntimeState, secondsLeft: number) => {
      clearTick();
      endTimeRef.current = Date.now() + secondsLeft * 1000;

      intervalRef.current = setInterval(() => {
        if (endTimeRef.current === null) return;

        const left = Math.round((endTimeRef.current - Date.now()) / 1000);
        const seq = sequenceRef.current;
        const cfg = configRef.current;

        if (left > 0) {
          setRuntime((prev) => ({ ...prev, remaining: left }));

          // Alerta de "próximo paso" al quedar 5s en descanso
          if (
            left === 5 &&
            runtimeRef.current.phase === "rest" &&
            !newStepAlertedRef.current
          ) {
            newStepAlertedRef.current = true;
            soundRef.current.playNewSeries();
          }
          return;
        }

        // Fase completada — determinar siguiente estado
        setRuntime((prev) => {
          const isWorkPhase = prev.phase === "work";
          const isLastStep = prev.stepIndex >= seq.length - 1;

          if (isWorkPhase) {
            // Fin del trabajo: ir a descanso (si existe) o al siguiente paso
            if (isLastStep) {
              // Último paso de trabajo: fin de la pirámide
              if (cfg.restSeconds > 0) {
                // Descanso final antes de terminar
                endTimeRef.current = Date.now() + cfg.restSeconds * 1000;
                newStepAlertedRef.current = false;
                soundRef.current.playRest();
                return { ...prev, phase: "rest", remaining: cfg.restSeconds };
              }
              // Sin descanso final: terminar directo
              clearInterval(intervalRef.current!);
              intervalRef.current = null;
              endTimeRef.current = null;
              setStatus("done");
              soundRef.current.playDone();
              return { ...prev, remaining: 0 };
            }

            if (cfg.restSeconds === 0) {
              // Sin descanso: pasar directamente al siguiente paso de trabajo
              const nextWorkDuration = seq[prev.stepIndex + 1];
              endTimeRef.current = Date.now() + nextWorkDuration * 1000;
              soundRef.current.playWork();
              return {
                stepIndex: prev.stepIndex + 1,
                phase: "work",
                remaining: nextWorkDuration,
              };
            }

            // Con descanso: cambiar a fase rest
            endTimeRef.current = Date.now() + cfg.restSeconds * 1000;
            newStepAlertedRef.current = false;
            soundRef.current.playRest();
            return { ...prev, phase: "rest", remaining: cfg.restSeconds };
          } else {
            // Fin del descanso
            if (prev.stepIndex >= seq.length - 1) {
              // Descanso final completado: terminar
              clearInterval(intervalRef.current!);
              intervalRef.current = null;
              endTimeRef.current = null;
              setStatus("done");
              soundRef.current.playDone();
              return { ...prev, remaining: 0 };
            }

            // Ir al siguiente paso de trabajo
            const nextWorkDuration = seq[prev.stepIndex + 1];
            endTimeRef.current = Date.now() + nextWorkDuration * 1000;
            soundRef.current.playWork();
            return {
              stepIndex: prev.stepIndex + 1,
              phase: "work",
              remaining: nextWorkDuration,
            };
          }
        });
      }, 250);
    },
    [clearTick],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const launchTimer = useCallback(() => {
    if (sequence.length === 0) return;

    let fromRuntime: RuntimeState;
    let secondsLeft: number;

    if (status === "paused" && pausedRuntimeRef.current) {
      fromRuntime = pausedRuntimeRef.current;
      secondsLeft = fromRuntime.remaining;
      pausedRuntimeRef.current = null;
    } else {
      fromRuntime = { stepIndex: 0, phase: "work", remaining: sequence[0] };
      secondsLeft = sequence[0];
      setRuntime(fromRuntime);
    }

    setStatus("running");
    startTick(fromRuntime, secondsLeft);
    soundRef.current.playWork();
  }, [sequence, status, startTick]);

  const handleStart = useCallback(() => {
    if (sequence.length === 0) return;
    if (!isFullscreen) enterFullscreen();
    if (!sidebarCollapsed) {
      sidebarToggle();
      didCollapseSidebarRef.current = true;
    }
    startPrepare(launchTimer);
  }, [
    sequence,
    isFullscreen,
    enterFullscreen,
    sidebarCollapsed,
    sidebarToggle,
    startPrepare,
    launchTimer,
  ]);

  const handlePause = useCallback(() => {
    clearTick();
    endTimeRef.current = null;
    pausedRuntimeRef.current = runtimeRef.current;
    setStatus("paused");
  }, [clearTick]);

  const handleStop = useCallback(() => {
    cancelPrepare();
    clearTick();
    endTimeRef.current = null;
    pausedRuntimeRef.current = null;
    setRuntime(initialRuntime(config.floors, config.stepSeconds));
    setStatus("idle");
    if (isFullscreen) exitFullscreen();
    if (didCollapseSidebarRef.current) {
      sidebarToggle();
      didCollapseSidebarRef.current = false;
    }
  }, [
    cancelPrepare,
    clearTick,
    config.floors,
    config.stepSeconds,
    isFullscreen,
    exitFullscreen,
    sidebarToggle,
  ]);

  const handleRestart = useCallback(() => {
    cancelPrepare();
    clearTick();
    const fresh: RuntimeState = {
      stepIndex: 0,
      phase: "work",
      remaining: sequence[0],
    };
    endTimeRef.current = Date.now() + sequence[0] * 1000;
    setRuntime(fresh);
    setStatus("running");
    startTick(fresh, sequence[0]);
    soundRef.current.playWork();
  }, [cancelPrepare, clearTick, sequence, startTick]);

  const handleResume = useCallback(() => {
    if (!pausedRuntimeRef.current) return;
    const fromRuntime = pausedRuntimeRef.current;
    const secondsLeft = fromRuntime.remaining;
    pausedRuntimeRef.current = null;
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    setStatus("running");
    startTick(fromRuntime, secondsLeft);
  }, [startTick]);

  const handleExitFullscreen = useCallback(() => {
    if (isPreparing) {
      cancelPrepare();
    } else if (status === "running") {
      clearTick();
      endTimeRef.current = null;
      pausedRuntimeRef.current = runtimeRef.current;
      setStatus("paused");
    }
    exitFullscreen();
    if (didCollapseSidebarRef.current) {
      sidebarToggle();
      didCollapseSidebarRef.current = false;
    }
  }, [
    isPreparing,
    status,
    cancelPrepare,
    clearTick,
    exitFullscreen,
    sidebarToggle,
  ]);

  const setField = useCallback(
    <K extends keyof PyramidConfig>(key: K, value: PyramidConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Derived ────────────────────────────────────────────────────────────────

  const { mm, ss } = formatTime(runtime.remaining);
  const isConfigDisabled =
    isPreparing || status === "running" || status === "paused";
  const canStart = sequence.length > 0;

  // Duración del paso/fase actual para la barra de progreso
  const currentPhaseDuration = useMemo(() => {
    if (status === "idle") return sequence[0] ?? 0;
    if (runtime.phase === "work") return sequence[runtime.stepIndex] ?? 0;
    return config.restSeconds;
  }, [status, runtime.phase, runtime.stepIndex, sequence, config.restSeconds]);

  const progressPercent =
    currentPhaseDuration > 0
      ? Math.round(
          ((currentPhaseDuration - runtime.remaining) / currentPhaseDuration) *
            100,
        )
      : 0;

  // Tono de color: info para trabajo (color de la pirámide), warning para descanso
  const fsTone: FullscreenTone =
    status === "done"
      ? "success"
      : runtime.phase === "work"
        ? "primary"
        : "warning";

  // Dirección actual en la pirámide
  const direction: Direction =
    runtime.stepIndex < config.floors ? "ascending" : "descending";

  // El preview cuando está en idle muestra la duración del primer paso
  const idlePreviewTime = useMemo(
    () => formatTime(sequence[0] ?? 0),
    [sequence],
  );

  const displayMm = status === "idle" ? idlePreviewTime.mm : mm;
  const displaySs = status === "idle" ? idlePreviewTime.ss : ss;

  // seriesMeta para el FullscreenDisplay (reutiliza SeriesBadge/Dots del display)
  const seriesMeta = useMemo(
    () =>
      status !== "idle" && status !== "done"
        ? {
            currentSeries: runtime.stepIndex + 1,
            totalSeries: sequence.length,
            phase: runtime.phase,
          }
        : undefined,
    [status, runtime.stepIndex, runtime.phase, sequence.length],
  );

  // Color del dígito inline
  const digitColor =
    status === "done"
      ? "text-success"
      : runtime.phase === "work"
        ? "text-info"
        : "text-warning";

  // Color de la barra de progreso inline
  const barColor =
    status === "done"
      ? "bg-success"
      : runtime.phase === "work"
        ? "bg-info"
        : "bg-warning";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Fullscreen projection overlay ─────────────────────────────── */}
      <FullscreenDisplay
        containerRef={fsRef}
        isFullscreen={isFullscreen}
        mm={displayMm}
        ss={displaySs}
        tone={fsTone}
        status={
          isPreparing ? "preparing" : status === "idle" ? "running" : status
        }
        progressPercent={progressPercent}
        prepareSecondsLeft={prepareSecondsLeft}
        seriesMeta={seriesMeta}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onRestart={handleRestart}
        onExitFullscreen={handleExitFullscreen}
      />

      {/* ── Config panel ──────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-8 px-2 py-4 sm:py-8">
        {/* Indicador de fase */}
        <PhaseIndicator
          phase={runtime.phase}
          stepIndex={runtime.stepIndex}
          sequence={sequence}
          direction={direction}
          status={status}
        />

        {/* Preview de dígitos + barra de progreso + pirámide visual */}
        <div className="flex w-full flex-col items-center gap-3">
          <div
            aria-live="off"
            aria-atomic="true"
            className={`metric-number select-none text-center text-[clamp(4.5rem,15vw,8rem)] font-bold leading-none tracking-tight transition-colors duration-500 ${
              status === "idle" ? "text-info/70" : digitColor
            }`}
          >
            <span aria-label={`${displayMm} minutos`}>{displayMm}</span>
            <span aria-hidden="true" className="mx-1.5 opacity-50">
              :
            </span>
            <span aria-label={`${displaySs} segundos`}>{displaySs}</span>
          </div>

          {/* Barra de progreso de la fase */}
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del paso actual"
            className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${status === "idle" ? 0 : progressPercent}%` }}
            />
          </div>

          {/* Visualización de la pirámide */}
          <PyramidVisual
            sequence={sequence}
            stepIndex={runtime.stepIndex}
            phase={runtime.phase}
            status={status}
          />
        </div>

        {/* Configuración */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-center">
          {/* Pisos (número de pasos en la subida) */}
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface-raised/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Pisos
            </p>
            <input
              type="number"
              min={2}
              max={10}
              value={config.floors}
              disabled={isConfigDisabled}
              onChange={(e) =>
                setField("floors", clamp(Number(e.target.value), 2, 10))
              }
              className="metric-number w-24 rounded-2xl border border-input bg-background/50 px-2 py-4 text-center text-4xl font-bold text-foreground transition-colors focus-visible:border-info focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
            />
            <p className="text-xs text-muted-foreground">2 – 10</p>
          </div>

          {/* Incremento por piso (trabajo) */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-info/20 bg-info/5 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-info">
              <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" />
              Trabajo / piso
            </p>
            <NumberInput
              label="Seg"
              value={config.stepSeconds}
              min={5}
              max={300}
              onChange={(v) => setField("stepSeconds", v)}
              disabled={isConfigDisabled}
              unit="segundos"
            />
          </div>

          {/* Descanso entre pasos */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-warning/20 bg-warning/5 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-warning">
              <Coffee aria-hidden="true" className="h-3.5 w-3.5" />
              Descanso
            </p>
            <NumberInput
              label="Seg"
              value={config.restSeconds}
              min={0}
              max={300}
              onChange={(v) => setField("restSeconds", v)}
              disabled={isConfigDisabled}
              unit="segundos"
            />
          </div>
        </div>

        {/* Resumen de la pirámide */}
        {sequence.length > 0 && (
          <div className="flex w-full max-w-sm flex-col gap-1.5 rounded-2xl border border-border bg-surface-raised/40 px-4 py-3">
            <p className="text-center text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Secuencia de trabajo
            </p>
            <p className="text-center text-sm font-semibold text-foreground/80">
              {sequence.map((s) => `${s}s`).join(" → ")}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              {sequence.length} pasos · ~
              {Math.round(
                (sequence.reduce((a, b) => a + b, 0) +
                  sequence.length * config.restSeconds) /
                  60,
              )}{" "}
              min totales
            </p>
          </div>
        )}

        {/* Controles */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {(status === "idle" || status === "done") && (
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={!canStart}
              className="min-w-36 gap-2"
              aria-label="Iniciar pirámide en pantalla completa"
            >
              <Maximize2 aria-hidden="true" className="h-4 w-4" />
              Iniciar
            </Button>
          )}

          {status === "paused" && (
            <>
              <Button
                variant="primary"
                onClick={handleStart}
                className="min-w-36 gap-2"
                aria-label="Reanudar en pantalla completa"
              >
                <Maximize2 aria-hidden="true" className="h-4 w-4" />
                Proyectar
              </Button>
              <Button
                variant="secondary"
                onClick={handleResume}
                className="gap-2"
                aria-label="Reanudar pirámide"
              >
                <Play aria-hidden="true" className="h-4 w-4 fill-current" />
                Reanudar
              </Button>
            </>
          )}

          {status === "running" && (
            <Button
              variant="secondary"
              onClick={handlePause}
              className="min-w-36 gap-2"
              aria-label="Pausar pirámide"
            >
              <Pause aria-hidden="true" className="h-4 w-4 fill-current" />
              Pausar
            </Button>
          )}

          {status !== "idle" && (
            <Button
              variant="danger"
              onClick={handleStop}
              className="gap-2"
              aria-label="Detener y reiniciar pirámide"
            >
              {status === "done" ? (
                <>
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Reiniciar
                </>
              ) : (
                <>
                  <Square aria-hidden="true" className="h-4 w-4 fill-current" />
                  Detener
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
