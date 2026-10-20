"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
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
  prepareSecondsLeft?: number;
  seriesMeta?: FullscreenSeriesMeta;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
  onExitFullscreen: () => void;
}

// ─── Image pools ─────────────────────────────────────────────────────────────

const WORK_IMAGES = [
  "/timers/entrenamiento_g_1.jpg",
  "/timers/entrenamiento_g_3.jpg",
  "/timers/entrenamiento_g_4.jpg",
  "/timers/entrenamiento_g_5.jpg",
] as const;

const REST_IMAGES = [
  "/rest/descanso_1.jpg",
  "/rest/descanso_2.jpg",
  "/rest/descanso_3.jpg",
] as const;

// ─── Background image hook ────────────────────────────────────────────────────

/**
 * Returns the image src to display as background.
 *
 * - Picks a new image from the correct pool each time `imageKey` changes.
 * - `imageKey` should change once per phase transition, not on every tick,
 *   so the image stays stable throughout a phase.
 * - Uses a counter ref to cycle sequentially through the pool rather than
 *   Math.random() to guarantee every image is shown before repeating.
 */
function usePhaseImage(phase: "work" | "rest", imageKey: string): string {
  const workIndexRef = useRef(0);
  const restIndexRef = useRef(0);
  const [src, setSrc] = useState<string>(WORK_IMAGES[0]);

  useEffect(() => {
    if (phase === "work") {
      const pool = WORK_IMAGES;
      const idx = workIndexRef.current % pool.length;
      workIndexRef.current += 1;
      setSrc(pool[idx]);
    } else {
      const pool = REST_IMAGES;
      const idx = restIndexRef.current % pool.length;
      restIndexRef.current += 1;
      setSrc(pool[idx]);
    }
    // imageKey changes once per phase transition — that's the only trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageKey]);

  return src;
}

// ─── Portal ───────────────────────────────────────────────────────────────────

function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
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

const PREPARE_TOTAL = 3;

// ─── Background image layer ───────────────────────────────────────────────────

/**
 * Full-bleed background image that blends with the dark background.
 *
 * - `fill` so Next.js never needs to know explicit dimensions.
 * - `priority` on the active image so it is never lazy-loaded mid-session.
 * - `mix-blend-mode: luminosity` strips the colour from the photo and lets
 *   the dark background tint show through.
 * - Low opacity keeps the digits readable from across the room.
 * - `transition-opacity` produces a soft crossfade on phase change.
 */
function BackgroundImage({
  src,
  phase,
}: {
  src: string;
  phase: "work" | "rest";
}) {
  // Track the previous src to allow a brief crossfade
  const [activeSrc, setActiveSrc] = useState(src);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (src === activeSrc) return;
    // Fade out → swap → fade in
    setVisible(false);
    const t = setTimeout(() => {
      setActiveSrc(src);
      setVisible(true);
    }, 300);
    return () => clearTimeout(t);
  }, [src, activeSrc]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <Image
        key={activeSrc}
        src={activeSrc}
        alt=""
        fill
        priority
        sizes="100vw"
        className={`object-cover transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        } ${
          phase === "work"
            ? "mix-blend-luminosity opacity-[0.18]"
            : "mix-blend-luminosity opacity-[0.12]"
        }`}
      />
      {/* Gradient overlay so digits always contrast against the image */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#181c2a]/80 via-[#181c2a]/40 to-[#181c2a]/60" />
    </div>
  );
}

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
      className={`metric-number relative select-none text-center font-bold leading-none tracking-tight transition-colors duration-500 ${toneColors[tone]}`}
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
          className="relative inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Minimize2 aria-hidden="true" className="h-4 w-4" />
          Salir
        </button>
      </div>

      <p className="relative animate-pulse text-center text-2xl font-bold uppercase tracking-[0.18em] text-info sm:text-3xl">
        ¡Prepárense!
      </p>

      <div
        aria-live="assertive"
        aria-atomic="true"
        aria-label={`${secondsLeft} segundos para comenzar`}
        className="metric-number relative select-none text-center font-bold leading-none tracking-tight text-info"
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
        className="relative h-2 w-full max-w-3xl overflow-hidden rounded-full bg-white/10"
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
        className="relative inline-flex items-center gap-2.5 rounded-2xl border border-destructive/50 bg-destructive/15 px-6 py-3.5 text-base font-bold text-destructive transition-colors hover:bg-destructive/25"
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
      className="relative h-2 w-full max-w-3xl overflow-hidden rounded-full bg-white/10"
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
    <div className="relative flex items-center gap-4">
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
      className="relative flex items-center gap-2"
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
      className={`relative inline-flex min-h-14 min-w-14 items-center justify-center gap-2.5 rounded-2xl border px-6 text-base font-bold transition-colors ${variantClasses[variant]}`}
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

  // Determine the phase for image selection
  // Series timer provides seriesMeta.phase; countdown timer always uses "work"
  const phase: "work" | "rest" = seriesMeta?.phase === "rest" ? "rest" : "work";

  // imageKey changes once per phase transition — drives the image swap.
  // For series: "work-{series}" or "rest-{series}".
  // For countdown: always "work" (single phase, single image for the session).
  const imageKey = seriesMeta
    ? `${seriesMeta.phase}-${seriesMeta.currentSeries}`
    : "work";

  const bgSrc = usePhaseImage(phase, imageKey);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Temporizador en pantalla completa"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-[#181c2a] px-6 py-8"
    >
      {/* Background image — sits below all content via absolute positioning */}
      {!isPreparing && <BackgroundImage src={bgSrc} phase={phase} />}

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
              className="relative inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Minimize2 aria-hidden="true" className="h-4 w-4" />
              Salir
            </button>
          </div>

          {seriesMeta && !isDone && <SeriesBadge meta={seriesMeta} />}

          {isDone && (
            <span className="relative rounded-full border border-success/40 bg-success/15 px-8 py-2.5 text-2xl font-bold text-success">
              ¡Completado!
            </span>
          )}

          <FullscreenDigits mm={mm} ss={ss} tone={isDone ? "success" : tone} />

          <FullscreenProgressBar
            percent={progressPercent}
            tone={isDone ? "success" : tone}
          />

          {seriesMeta && !isDone && <SeriesProgressDots meta={seriesMeta} />}

          <div className="relative flex items-center justify-center gap-4">
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
              className="pointer-events-none absolute inset-0 bg-black/40"
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
