"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Dumbbell,
  Coffee,
  Maximize2,
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

interface SeriesConfig {
  totalSeries: number;
  workMinutes: number;
  workSeconds: number;
  restMinutes: number;
  restSeconds: number;
}

interface RuntimeState {
  currentSeries: number; // 1-indexed
  phase: Phase;
  remaining: number; // seconds
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, max: number): number {
  if (Number.isNaN(value) || value < 0) return 0;
  return Math.min(value, max);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTime(totalSeconds: number): { mm: string; ss: string } {
  const s = Math.max(0, totalSeconds);
  return { mm: pad(Math.floor(s / 60)), ss: pad(s % 60) };
}

function phaseDuration(config: SeriesConfig, phase: Phase): number {
  return phase === "work"
    ? config.workMinutes * 60 + config.workSeconds
    : config.restMinutes * 60 + config.restSeconds;
}

function initialRuntime(config: SeriesConfig): RuntimeState {
  return {
    currentSeries: 1,
    phase: "work",
    remaining: phaseDuration(config, "work"),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhaseIndicator({
  phase,
  currentSeries,
  totalSeries,
  status,
}: {
  phase: Phase;
  currentSeries: number;
  totalSeries: number;
  status: Status;
}) {
  if (status === "idle") return null;

  const isWork = phase === "work";
  const bgClass = isWork
    ? "border-primary/30 bg-primary/10 text-primary"
    : "border-warning/30 bg-warning/10 text-warning";
  const Icon = isWork ? Dumbbell : Coffee;
  const label = isWork ? "Trabajo" : "Descanso";

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
          Serie {currentSeries} / {totalSeries}
        </span>
      )}
    </div>
  );
}

function SeriesProgressDots({
  totalSeries,
  currentSeries,
  phase,
  status,
}: {
  totalSeries: number;
  currentSeries: number;
  phase: Phase;
  status: Status;
}) {
  if (totalSeries <= 0 || status === "idle") return null;

  return (
    <div
      aria-label={`Progreso: serie ${currentSeries} de ${totalSeries}`}
      className="flex w-full max-w-xs items-center justify-center gap-1.5"
    >
      {Array.from({ length: totalSeries }, (_, i) => {
        const seriesNum = i + 1;
        const completed = status === "done" || seriesNum < currentSeries;
        const isCurrent = seriesNum === currentSeries && status !== "done";
        const isRest = isCurrent && phase === "rest";

        return (
          <div
            key={i}
            aria-hidden="true"
            className={`h-2 flex-1 rounded-full transition-all duration-500 ${
              status === "done"
                ? "bg-success"
                : completed && !isCurrent
                  ? "bg-primary/60"
                  : isCurrent && !isRest
                    ? "bg-primary"
                    : isCurrent && isRest
                      ? "bg-warning"
                      : "bg-muted"
            }`}
          />
        );
      })}
    </div>
  );
}

function NumberInput({
  label,
  value,
  max,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value), max))}
        className="metric-number w-24 rounded-2xl border border-input bg-background/50 px-2 py-4 text-center text-4xl font-bold text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
      />
    </label>
  );
}

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
  disabled?: boolean;
}) {
  const accentBg =
    accent === "primary"
      ? "border-primary/20 bg-primary/5"
      : "border-warning/20 bg-warning/5";
  const accentText = accent === "primary" ? "text-primary" : "text-warning";

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl border p-4 ${accentBg}`}
    >
      <p
        className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] ${accentText}`}
      >
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {title}
      </p>
      <div className="flex items-end gap-3">
        <NumberInput
          label="Min"
          value={minutes}
          max={59}
          onChange={onMinutesChange}
          disabled={disabled}
        />
        <span
          aria-hidden="true"
          className="metric-number mb-5 text-3xl font-bold text-muted-foreground/50"
        >
          :
        </span>
        <NumberInput
          label="Seg"
          value={seconds}
          max={59}
          onChange={onSecondsChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SeriesTimer() {
  // ── Config ─────────────────────────────────────────────────────────────────
  const [config, setConfig] = useState<SeriesConfig>({
    totalSeries: 3,
    workMinutes: 3,
    workSeconds: 0,
    restMinutes: 1,
    restSeconds: 0,
  });

  // ── Runtime ────────────────────────────────────────────────────────────────
  const [runtime, setRuntime] = useState<RuntimeState>(() =>
    initialRuntime({
      totalSeries: 3,
      workMinutes: 3,
      workSeconds: 0,
      restMinutes: 1,
      restSeconds: 0,
    }),
  );
  const [status, setStatus] = useState<Status>("idle");

  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRuntimeRef = useRef<RuntimeState | null>(null);
  // Track last second to fire beep only once per second across 250ms ticks
  const lastBeepSecondRef = useRef<number>(-1);
  const newSeriesAlertedRef = useRef(false);
  // Tracks the current phase so the interval can read it without a state lookup
  const currentPhaseRef = useRef<Phase>("work");

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const {
    isFullscreen,
    enter: enterFullscreen,
    exit: exitFullscreen,
    ref: fsRef,
  } = useFullscreen();

  // ── Sidebar collapse ───────────────────────────────────────────────────────
  const sidebarCollapsed = useSidebarCollapsed();
  const sidebarToggle = useSidebarToggle();
  const didCollapseSidebarRef = useRef(false);

  // ── Sound ──────────────────────────────────────────────────────────────────
  const { playWork, playRest, playDone, preload, playBeep, playNewSeries } =
    useTimerSound();
  // Ref so the setInterval closure always reads the latest callbacks
  const soundRef = useRef({ playWork, playRest, playDone, playNewSeries });
  useEffect(() => {
    soundRef.current = { playWork, playRest, playDone, playNewSeries };
  });

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

  // When the series finishes naturally, exit fullscreen and restore the sidebar
  useEffect(() => {
    if (status !== "done") return;
    exitFullscreen();
    if (didCollapseSidebarRef.current) {
      sidebarToggle();
      didCollapseSidebarRef.current = false;
    }
    // Reset to idle after a brief moment so the user sees the transition
    const t = setTimeout(() => {
      setRuntime(initialRuntime(config));
      setStatus("idle");
    }, 600);
    return () => clearTimeout(t);
  }, [status, exitFullscreen, sidebarToggle, config]);

  const [prevConfig, setPrevConfig] = useState(config);
  if (status === "idle" && prevConfig !== config) {
    setPrevConfig(config);
    setRuntime(initialRuntime(config));
  }
  const startTick = useCallback(
    (_fromRuntime: RuntimeState, secondsLeft: number, cfg: SeriesConfig) => {
      clearTick();
      endTimeRef.current = Date.now() + secondsLeft * 1000;
      lastBeepSecondRef.current = -1;
      currentPhaseRef.current = _fromRuntime.phase;

      intervalRef.current = setInterval(() => {
        if (endTimeRef.current === null) return;

        const left = Math.round((endTimeRef.current - Date.now()) / 1000);

        if (left > 0) {
          setRuntime((prev) => ({ ...prev, remaining: left }));

          // Fire "nueva serie" only during a rest phase, once at 10 seconds
          if (
            left === 5 &&
            currentPhaseRef.current === "rest" &&
            !newSeriesAlertedRef.current
          ) {
            newSeriesAlertedRef.current = true;
            soundRef.current.playNewSeries();
          }

          return;
        }

        // Current phase finished — decide what comes next
        setRuntime((prev) => {
          const isWorkPhase = prev.phase === "work";
          const isLastSeries = prev.currentSeries >= cfg.totalSeries;

          if (isWorkPhase) {
            if (isLastSeries) {
              clearInterval(intervalRef.current!);
              intervalRef.current = null;
              endTimeRef.current = null;
              setStatus("done");
              soundRef.current.playDone();
              return { ...prev, remaining: 0 };
            }

            const restDuration = phaseDuration(cfg, "rest");
            if (restDuration === 0) {
              const nextWork = phaseDuration(cfg, "work");
              endTimeRef.current = Date.now() + nextWork * 1000;
              lastBeepSecondRef.current = -1;
              currentPhaseRef.current = "work";
              soundRef.current.playWork();
              return {
                currentSeries: prev.currentSeries + 1,
                phase: "work",
                remaining: nextWork,
              };
            }

            endTimeRef.current = Date.now() + restDuration * 1000;
            lastBeepSecondRef.current = -1;
            newSeriesAlertedRef.current = false;
            currentPhaseRef.current = "rest";
            soundRef.current.playRest();
            return { ...prev, phase: "rest", remaining: restDuration };
          } else {
            const workDuration = phaseDuration(cfg, "work");
            endTimeRef.current = Date.now() + workDuration * 1000;
            lastBeepSecondRef.current = -1;
            currentPhaseRef.current = "work";
            soundRef.current.playWork();
            return {
              currentSeries: prev.currentSeries + 1,
              phase: "work",
              remaining: workDuration,
            };
          }
        });
      }, 250);
    },
    [clearTick],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  // ── Derived: the actual tick launch (called by usePrepare when 5s elapse) ──

  const launchTimer = useCallback(() => {
    const workDuration = phaseDuration(config, "work");
    if (workDuration === 0 || config.totalSeries === 0) return;

    let fromRuntime: RuntimeState;
    let secondsLeft: number;

    if (status === "paused" && pausedRuntimeRef.current) {
      fromRuntime = pausedRuntimeRef.current;
      secondsLeft = fromRuntime.remaining;
      pausedRuntimeRef.current = null;
    } else {
      fromRuntime = initialRuntime(config);
      secondsLeft = phaseDuration(config, fromRuntime.phase);
      setRuntime(fromRuntime);
    }

    setStatus("running");
    startTick(fromRuntime, secondsLeft, config);
    soundRef.current.playWork();
  }, [config, status, startTick]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    const workDuration = phaseDuration(config, "work");
    if (workDuration === 0 || config.totalSeries === 0) return;

    if (!isFullscreen) enterFullscreen();
    if (!sidebarCollapsed) {
      sidebarToggle();
      didCollapseSidebarRef.current = true;
    }
    startPrepare(launchTimer);
  }, [
    config,
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
    pausedRuntimeRef.current = runtime;
    setStatus("paused");
  }, [clearTick, runtime]);

  const handleStop = useCallback(() => {
    cancelPrepare();
    clearTick();
    endTimeRef.current = null;
    pausedRuntimeRef.current = null;
    setRuntime(initialRuntime(config));
    setStatus("idle");
    if (isFullscreen) exitFullscreen();
    if (didCollapseSidebarRef.current) {
      sidebarToggle();
      didCollapseSidebarRef.current = false;
    }
  }, [
    cancelPrepare,
    clearTick,
    config,
    isFullscreen,
    exitFullscreen,
    sidebarToggle,
  ]);

  const handleRestart = useCallback(() => {
    cancelPrepare();
    clearTick();
    const fresh = initialRuntime(config);
    const secondsLeft = phaseDuration(config, fresh.phase);
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    setRuntime(fresh);
    setStatus("running");
    startTick(fresh, secondsLeft, config);
  }, [cancelPrepare, clearTick, config, startTick]);

  const handleResume = useCallback(() => {
    if (!pausedRuntimeRef.current) return;
    const fromRuntime = pausedRuntimeRef.current;
    const secondsLeft = fromRuntime.remaining;
    pausedRuntimeRef.current = null;
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    setStatus("running");
    startTick(fromRuntime, secondsLeft, config);
  }, [config, startTick]);

  const handleExitFullscreen = useCallback(() => {
    if (isPreparing) {
      cancelPrepare();
    } else if (status === "running") {
      clearTick();
      endTimeRef.current = null;
      pausedRuntimeRef.current = runtime;
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
    runtime,
    exitFullscreen,
    sidebarToggle,
  ]);

  const setField = useCallback(
    <K extends keyof SeriesConfig>(key: K, value: SeriesConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Derived ────────────────────────────────────────────────────────────────

  const { mm, ss } = formatTime(runtime.remaining);
  const isConfigDisabled =
    isPreparing || status === "running" || status === "paused";
  const canStart = phaseDuration(config, "work") > 0 && config.totalSeries > 0;

  const currentPhaseDuration =
    status === "idle"
      ? phaseDuration(config, "work")
      : phaseDuration(config, runtime.phase);

  const progressPercent =
    currentPhaseDuration > 0
      ? Math.round(
          ((currentPhaseDuration - runtime.remaining) / currentPhaseDuration) *
            100,
        )
      : 0;

  const fsTone: FullscreenTone =
    status === "done"
      ? "success"
      : runtime.phase === "work"
        ? "primary"
        : "warning";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Fullscreen projection overlay ─────────────────────────────── */}
      <FullscreenDisplay
        containerRef={fsRef}
        isFullscreen={isFullscreen}
        mm={
          status === "idle" ? formatTime(phaseDuration(config, "work")).mm : mm
        }
        ss={
          status === "idle" ? formatTime(phaseDuration(config, "work")).ss : ss
        }
        tone={fsTone}
        status={
          isPreparing ? "preparing" : status === "idle" ? "running" : status
        }
        progressPercent={progressPercent}
        prepareSecondsLeft={prepareSecondsLeft}
        seriesMeta={
          status !== "idle" && status !== "done"
            ? {
                currentSeries: runtime.currentSeries,
                totalSeries: config.totalSeries,
                phase: runtime.phase,
              }
            : undefined
        }
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onRestart={handleRestart}
        onExitFullscreen={handleExitFullscreen}
      />

      {/* ── Config panel ──────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-8 px-2 py-4 sm:py-8">
        {/* Phase indicator */}
        <PhaseIndicator
          phase={runtime.phase}
          currentSeries={runtime.currentSeries}
          totalSeries={config.totalSeries}
          status={status}
        />

        {/* Inline preview */}
        <div className="flex w-full flex-col items-center gap-3">
          <div
            aria-live="off"
            aria-atomic="true"
            className={`metric-number select-none text-center text-[clamp(4.5rem,15vw,8rem)] font-bold leading-none tracking-tight transition-colors duration-500 ${
              status === "done"
                ? "text-success"
                : runtime.phase === "work"
                  ? "text-primary"
                  : "text-warning"
            }`}
          >
            <span
              aria-label={`${status === "idle" ? formatTime(phaseDuration(config, "work")).mm : mm} minutos`}
            >
              {status === "idle"
                ? formatTime(phaseDuration(config, "work")).mm
                : mm}
            </span>
            <span aria-hidden="true" className="mx-1.5 opacity-50">
              :
            </span>
            <span
              aria-label={`${status === "idle" ? formatTime(phaseDuration(config, "work")).ss : ss} segundos`}
            >
              {status === "idle"
                ? formatTime(phaseDuration(config, "work")).ss
                : ss}
            </span>
          </div>

          {/* Phase progress bar */}
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso de la fase actual"
            className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                status === "done"
                  ? "bg-success"
                  : runtime.phase === "work"
                    ? "bg-primary"
                    : "bg-warning"
              }`}
              style={{ width: `${status === "idle" ? 0 : progressPercent}%` }}
            />
          </div>

          {/* Series dots */}
          <SeriesProgressDots
            totalSeries={config.totalSeries}
            currentSeries={runtime.currentSeries}
            phase={runtime.phase}
            status={status}
          />
        </div>

        {/* Configuration */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-center">
          {/* Total series */}
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface-raised/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Series
            </p>
            <input
              type="number"
              min={1}
              max={20}
              value={config.totalSeries}
              disabled={isConfigDisabled}
              onChange={(e) =>
                setField("totalSeries", clamp(Number(e.target.value), 20))
              }
              className="metric-number w-24 rounded-2xl border border-input bg-background/50 px-2 py-4 text-center text-4xl font-bold text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
            />
          </div>

          <ConfigSection
            title="Trabajo"
            accent="primary"
            icon={Dumbbell}
            minutes={config.workMinutes}
            seconds={config.workSeconds}
            onMinutesChange={(v) => setField("workMinutes", v)}
            onSecondsChange={(v) => setField("workSeconds", v)}
            disabled={isConfigDisabled}
          />

          <ConfigSection
            title="Descanso"
            accent="warning"
            icon={Coffee}
            minutes={config.restMinutes}
            seconds={config.restSeconds}
            onMinutesChange={(v) => setField("restMinutes", v)}
            onSecondsChange={(v) => setField("restSeconds", v)}
            disabled={isConfigDisabled}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {(status === "idle" || status === "done") && (
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={!canStart}
              className="min-w-36 gap-2"
              aria-label="Iniciar series en pantalla completa"
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
                aria-label="Reanudar series"
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
              aria-label="Pausar series"
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
              aria-label="Detener y reiniciar series"
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
