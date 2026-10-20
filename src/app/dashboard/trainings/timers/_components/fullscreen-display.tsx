"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  Pause,
  Play,
  Square,
  RotateCcw,
  Minimize2,
  Dumbbell,
  Coffee,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

// "preparing" = 5-second get-ready countdown before the real timer starts
export type FullscreenStatus = "preparing" | "running" | "paused" | "done";

export type FullscreenTone = "primary" | "warning" | "success";

export interface FullscreenSeriesMeta {
  currentSeries: number;
  totalSeries: number;
  phase: "work" | "rest";
}

export interface FullscreenDisplayProps {
  containerRef: RefObject<HTMLDivElement | null>;
  isFullscreen: boolean;
  mm: string;
  ss: string;
  tone: FullscreenTone;
  status: FullscreenStatus;
  progressPercent: number;
  /** Remaining seconds of the preparation countdown */
  prepareSecondsLeft?: number;
  seriesMeta?: FullscreenSeriesMeta;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
  onExitFullscreen: () => void;
}

// ─── Portal ───────────────────────────────────────────────────────────────────

/**
 * Mounts children directly on document.body via a React portal.
 * This guarantees the overlay escapes any stacking context created by
 * ancestor elements (rounded corners, shadows, transforms, will-change, etc.)
 * and truly covers the full viewport.
 */
function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Only run on the client — portals require document to exist
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toneColors: Record<FullscreenTone, string> = {
  primary: "text-primary",
  warning: "text-warning",
  success: "text-success",
};

const toneBar: Record<FullscreenTone, string> = {
  primary: "bg-primary",
  warning: "bg-warning",
  success: "bg-success",
};

const PREPARE_TOTAL = 5;

// ─── Sub-components ───────────────────────────────────────────────────────────

function FullscreenDigits({
  mm,
  ss,
  tone,
}: {
  mm: string;
  ss: string;
  tone: FullscreenTone;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`metric-number select-none text-center font-bold leading-none tracking-tight transition-colors duration-500 ${toneColors[tone]}`}
      style={{ fontSize: "clamp(7rem, 28vw, 22rem)" }}
    >
      <span aria-label={`${mm} minutos`}>{mm}</span>
      <span aria-hidden="true" className="mx-2 opacity-40">
        :
      </span>
      <span aria-label={`${ss} segundos`}>{ss}</span>
    </div>
  );
}

function PrepareScreen({
  secondsLeft,
  onStop,
  onExitFullscreen,
}: {
  secondsLeft: number;
  onStop: () => void;
  onExitFullscreen: () => void;
}) {
  const progressPercent = Math.round(
    ((PREPARE_TOTAL - secondsLeft) / PREPARE_TOTAL) * 100,
  );

  return (
    <>
      <div className="absolute inset-x-0 top-0 flex items-center justify-end px-6 py-4">
        <button
          type="button"
          onClick={onExitFullscreen}
          aria-label="Salir de pantalla completa"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Minimize2 aria-hidden="true" className="h-4 w-4" />
          Salir
        </button>
      </div>

      <p className="animate-pulse text-center text-2xl font-bold uppercase tracking-[0.18em] text-info sm:text-3xl">
        ¡Prepárense!
      </p>

      <div
        aria-live="assertive"
        aria-atomic="true"
        aria-label={`${secondsLeft} segundos para comenzar`}
        className="metric-number select-none text-center font-bold leading-none tracking-tight text-info"
        style={{ fontSize: "clamp(10rem, 40vw, 30rem)" }}
      >
        {secondsLeft}
      </div>

      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de la preparación"
        className="h-2 w-full max-w-3xl overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-info transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <button
        type="button"
        onClick={onStop}
        aria-label="Cancelar preparación"
        className="inline-flex items-center gap-2.5 rounded-2xl border border-destructive/50 bg-destructive/15 px-6 py-3.5 text-base font-bold text-destructive transition-colors hover:bg-destructive/25"
      >
        <Square aria-hidden="true" className="h-5 w-5 fill-current" />
        Cancelar
      </button>
    </>
  );
}

function FullscreenProgressBar({
  percent,
  tone,
}: {
  percent: number;
  tone: FullscreenTone;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progreso de la fase actual"
      className="h-2 w-full max-w-3xl overflow-hidden rounded-full bg-white/10"
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${toneBar[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function SeriesBadge({ meta }: { meta: FullscreenSeriesMeta }) {
  const isWork = meta.phase === "work";
  const Icon = isWork ? Dumbbell : Coffee;
  const label = isWork ? "Trabajo" : "Descanso";
  const colorClass = isWork
    ? "border-primary/40 bg-primary/15 text-primary"
    : "border-warning/40 bg-warning/15 text-warning";

  return (
    <div className="flex items-center gap-4">
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-lg font-bold transition-all duration-500 ${colorClass}`}
      >
        <Icon aria-hidden="true" className="h-5 w-5" />
        {label}
      </span>
      <span className="metric-number text-2xl font-bold text-white/60">
        Serie {meta.currentSeries} / {meta.totalSeries}
      </span>
    </div>
  );
}

function SeriesProgressDots({ meta }: { meta: FullscreenSeriesMeta }) {
  return (
    <div
      aria-label={`Serie ${meta.currentSeries} de ${meta.totalSeries}`}
      className="flex items-center gap-2"
    >
      {Array.from({ length: meta.totalSeries }, (_, i) => {
        const n = i + 1;
        const completed = n < meta.currentSeries;
        const current = n === meta.currentSeries;
        const isRest = current && meta.phase === "rest";

        return (
          <div
            key={i}
            aria-hidden="true"
            className={`h-3 w-3 rounded-full transition-all duration-500 ${
              completed
                ? "bg-primary/70"
                : current && !isRest
                  ? "scale-125 bg-primary"
                  : current && isRest
                    ? "scale-125 bg-warning"
                    : "bg-white/20"
            }`}
          />
        );
      })}
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  variant,
  children,
}: {
  onClick: () => void;
  label: string;
  variant: "primary" | "secondary" | "danger";
  children: React.ReactNode;
}) {
  const variantClasses = {
    primary: "border-primary/50 bg-primary/20 text-primary hover:bg-primary/30",
    secondary: "border-white/20 bg-white/10 text-white hover:bg-white/20",
    danger:
      "border-destructive/50 bg-destructive/15 text-destructive hover:bg-destructive/25",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex min-h-14 min-w-14 items-center justify-center gap-2.5 rounded-2xl border px-6 text-base font-bold transition-colors ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}

// ─── Overlay content ──────────────────────────────────────────────────────────

function OverlayContent({
  containerRef,
  mm,
  ss,
  tone,
  status,
  progressPercent,
  prepareSecondsLeft = PREPARE_TOTAL,
  seriesMeta,
  onPause,
  onResume,
  onStop,
  onRestart,
  onExitFullscreen,
}: Omit<FullscreenDisplayProps, "isFullscreen">) {
  const isPreparing = status === "preparing";
  const isDone = status === "done";
  const isRunning = status === "running";
  const isPaused = status === "paused";

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Temporizador en pantalla completa"
      /*
       * Portal ensures this renders on document.body, completely outside
       * any ancestor stacking context. fixed + inset-0 then correctly
       * covers 100% of the viewport with no surrounding card or border.
       */
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-[#181c2a] px-6 py-8"
    >
      {isPreparing ? (
        <PrepareScreen
          secondsLeft={prepareSecondsLeft}
          onStop={onStop}
          onExitFullscreen={onExitFullscreen}
        />
      ) : (
        <>
          {/* Exit button */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-end px-6 py-4">
            <button
              type="button"
              onClick={onExitFullscreen}
              aria-label="Salir de pantalla completa"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Minimize2 aria-hidden="true" className="h-4 w-4" />
              Salir
            </button>
          </div>

          {seriesMeta && !isDone && <SeriesBadge meta={seriesMeta} />}

          {isDone && (
            <span className="rounded-full border border-success/40 bg-success/15 px-8 py-2.5 text-2xl font-bold text-success">
              ¡Completado!
            </span>
          )}

          <FullscreenDigits mm={mm} ss={ss} tone={isDone ? "success" : tone} />

          <FullscreenProgressBar
            percent={progressPercent}
            tone={isDone ? "success" : tone}
          />

          {seriesMeta && !isDone && <SeriesProgressDots meta={seriesMeta} />}

          <div className="flex items-center justify-center gap-4">
            {isRunning && (
              <ControlButton
                onClick={onPause}
                label="Pausar"
                variant="secondary"
              >
                <Pause aria-hidden="true" className="h-6 w-6 fill-current" />
                Pausar
              </ControlButton>
            )}
            {isPaused && (
              <ControlButton
                onClick={onResume}
                label="Reanudar"
                variant="primary"
              >
                <Play aria-hidden="true" className="h-6 w-6 fill-current" />
                Reanudar
              </ControlButton>
            )}
            {isDone && (
              <ControlButton
                onClick={onRestart}
                label="Reiniciar"
                variant="primary"
              >
                <RotateCcw aria-hidden="true" className="h-6 w-6" />
                Reiniciar
              </ControlButton>
            )}
            {(isRunning || isPaused) && (
              <ControlButton onClick={onStop} label="Detener" variant="danger">
                <Square aria-hidden="true" className="h-6 w-6 fill-current" />
                Detener
              </ControlButton>
            )}
          </div>

          {isPaused && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-black/30"
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function FullscreenDisplay(props: FullscreenDisplayProps) {
  if (!props.isFullscreen) return null;

  return (
    <BodyPortal>
      <OverlayContent {...props} />
    </BodyPortal>
  );
}
