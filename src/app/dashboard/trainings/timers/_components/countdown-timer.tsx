"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Square, RotateCcw, Maximize2 } from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import { useFullscreen } from "./use-fullscreen";
import { FullscreenDisplay } from "./fullscreen-display";
import type { FullscreenTone } from "./fullscreen-display";
import { usePrepare } from "./use-prepare";
import {
  useSidebarCollapsed,
  useSidebarToggle,
} from "@/presentation/components/app-shell";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "idle" | "running" | "paused" | "done";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clampField(value: number, max: number): number {
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

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Inline preview digits shown in the config card.
 * Size is intentionally large so an instructor can read the current value
 * from across a room before starting.
 */
function PreviewDigits({
  mm,
  ss,
  tone,
}: {
  mm: string;
  ss: string;
  tone: "default" | "warning" | "done";
}) {
  const colorMap = {
    default: "text-foreground",
    warning: "text-warning",
    done: "text-success",
  } as const;

  return (
    <div
      aria-live="off"
      aria-atomic="true"
      className={`metric-number select-none text-center text-[clamp(4.5rem,15vw,8rem)] font-bold leading-none tracking-tight transition-colors duration-500 ${colorMap[tone]}`}
    >
      <span aria-label={`${mm} minutos`}>{mm}</span>
      <span aria-hidden="true" className="mx-1.5 opacity-50">
        :
      </span>
      <span aria-label={`${ss} segundos`}>{ss}</span>
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
        onChange={(e) => onChange(clampField(Number(e.target.value), max))}
        className="metric-number w-28 rounded-2xl border border-input bg-background/50 px-3 py-4 text-center text-4xl font-bold text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
      />
    </label>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CountdownTimer() {
  // ── Config ─────────────────────────────────────────────────────────────────
  const [configMinutes, setConfigMinutes] = useState(3);
  const [configSeconds, setConfigSeconds] = useState(0);

  // ── Runtime ────────────────────────────────────────────────────────────────
  const [remaining, setRemaining] = useState<number>(3 * 60);
  const [status, setStatus] = useState<Status>("idle");

  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = configMinutes * 60 + configSeconds;

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const {
    isFullscreen,
    enter: enterFullscreen,
    exit: exitFullscreen,
    ref: fsRef,
  } = useFullscreen();

  // ── Preparation countdown ──────────────────────────────────────────────────
  const { isPreparing, prepareSecondsLeft, startPrepare, cancelPrepare } =
    usePrepare();

  // ── Sidebar collapse ───────────────────────────────────────────────────────
  // Collapse the sidebar when projecting to gain screen space.
  // We track whether *we* collapsed it so we only restore it if we did.
  const sidebarCollapsed = useSidebarCollapsed();
  const sidebarToggle = useSidebarToggle();
  const didCollapseSidebarRef = useRef(false);

  // ── Tick ───────────────────────────────────────────────────────────────────

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    clearTick();
    intervalRef.current = setInterval(() => {
      if (endTimeRef.current === null) return;
      const left = Math.round((endTimeRef.current - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setRemaining(0);
        setStatus("done");
      } else {
        setRemaining(left);
      }
    }, 250);
  }, [clearTick]);

  // Cleanup on unmount
  useEffect(() => () => clearTick(), [clearTick]);

  // When the countdown finishes naturally, exit fullscreen and reset to idle
  useEffect(() => {
    if (status !== "done") return;
    exitFullscreen();
    if (didCollapseSidebarRef.current) {
      sidebarToggle();
      didCollapseSidebarRef.current = false;
    }
    const t = setTimeout(() => {
      setRemaining(totalSeconds);
      setStatus("idle");
    }, 600);
    return () => clearTimeout(t);
  }, [status, exitFullscreen, sidebarToggle, totalSeconds]);

  // Re-sync remaining when config changes while idle
  useEffect(() => {
    if (status === "idle") {
      setRemaining(totalSeconds);
    }
  }, [configMinutes, configSeconds, status, totalSeconds]);

  // ── Derived: the actual tick launch (called by usePrepare when 5s elapse) ──

  const launchTimer = useCallback(() => {
    const secondsLeft = status === "paused" ? remaining : totalSeconds;
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    setStatus("running");
    startTick();
  }, [status, remaining, totalSeconds, startTick]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    if (totalSeconds === 0) return;
    // Enter fullscreen and collapse sidebar immediately on click
    if (!isFullscreen) enterFullscreen();
    if (!sidebarCollapsed) {
      sidebarToggle();
      didCollapseSidebarRef.current = true;
    }
    // Then run the 5-second preparation, launching the real timer on done
    startPrepare(launchTimer);
  }, [
    totalSeconds,
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
    setStatus("paused");
  }, [clearTick]);

  const handleStop = useCallback(() => {
    cancelPrepare();
    clearTick();
    endTimeRef.current = null;
    setRemaining(totalSeconds);
    setStatus("idle");
    if (isFullscreen) exitFullscreen();
    if (didCollapseSidebarRef.current) {
      sidebarToggle();
      didCollapseSidebarRef.current = false;
    }
  }, [
    cancelPrepare,
    clearTick,
    totalSeconds,
    isFullscreen,
    exitFullscreen,
    sidebarToggle,
  ]);

  const handleRestart = useCallback(() => {
    cancelPrepare();
    clearTick();
    endTimeRef.current = Date.now() + totalSeconds * 1000;
    setRemaining(totalSeconds);
    setStatus("running");
    startTick();
  }, [cancelPrepare, clearTick, totalSeconds, startTick]);

  const handleResume = useCallback(() => {
    const secondsLeft = remaining;
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    setStatus("running");
    startTick();
  }, [remaining, startTick]);

  const handleExitFullscreen = useCallback(() => {
    if (isPreparing) {
      cancelPrepare();
    } else if (status === "running") {
      clearTick();
      endTimeRef.current = null;
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

  // ── Derived display ────────────────────────────────────────────────────────

  const { mm, ss } = formatTime(remaining);

  const displayTone: "default" | "warning" | "done" =
    status === "done"
      ? "done"
      : remaining <= 10 && status === "running"
        ? "warning"
        : "default";

  const fsTone: FullscreenTone =
    status === "done"
      ? "success"
      : remaining <= 10 && status === "running"
        ? "warning"
        : "primary";

  const progressPercent =
    totalSeconds > 0
      ? Math.round(((totalSeconds - remaining) / totalSeconds) * 100)
      : 0;

  const isConfigDisabled =
    isPreparing || status === "running" || status === "paused";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Fullscreen projection overlay ─────────────────────────────── */}
      <FullscreenDisplay
        containerRef={fsRef}
        isFullscreen={isFullscreen}
        mm={mm}
        ss={ss}
        tone={fsTone}
        status={
          isPreparing ? "preparing" : status === "idle" ? "running" : status
        }
        progressPercent={progressPercent}
        prepareSecondsLeft={prepareSecondsLeft}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onRestart={handleRestart}
        onExitFullscreen={handleExitFullscreen}
      />

      {/* ── Config + inline preview (always mounted, hidden when fullscreen) */}
      <div className="flex flex-col items-center gap-8 px-2 py-4 sm:py-8">
        {/* ── Inline preview digits ──────────────────────────────────── */}
        <div className="flex w-full flex-col items-center gap-3">
          <PreviewDigits mm={mm} ss={ss} tone={displayTone} />

          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del temporizador"
            className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="h-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {status === "idle" && totalSeconds > 0 && "Listo para iniciar"}
            {status === "running" && "En curso"}
            {status === "paused" && "Pausado"}
            {status === "done" && "¡Tiempo!"}
            {status === "idle" && totalSeconds === 0 && "Configura la duración"}
          </p>
        </div>

        {/* ── Configuration inputs ───────────────────────────────────── */}
        <div
          className="flex items-end gap-5"
          aria-label="Configuración del tiempo"
        >
          <NumberInput
            label="Minutos"
            value={configMinutes}
            max={99}
            onChange={setConfigMinutes}
            disabled={isConfigDisabled}
          />
          <span
            aria-hidden="true"
            className="metric-number mb-5 text-4xl font-bold text-muted-foreground/50"
          >
            :
          </span>
          <NumberInput
            label="Segundos"
            value={configSeconds}
            max={59}
            onChange={setConfigSeconds}
            disabled={isConfigDisabled}
          />
        </div>

        {/* ── Controls ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {(status === "idle" || status === "done") && (
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={totalSeconds === 0}
              className="min-w-36 gap-2"
              aria-label="Iniciar temporizador en pantalla completa"
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
                aria-label="Reanudar temporizador"
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
              aria-label="Pausar temporizador"
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
              aria-label="Detener y reiniciar temporizador"
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
