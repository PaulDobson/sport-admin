"use client";

import {
  memo,
  useEffect,
  useMemo,
  useReducer,
  useSyncExternalStore,
  useState,
  type RefObject,
} from "react";
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

// ─── Static lookup tables (module-level — zero allocation per render) ─────────

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

// Extracted to module scope: recreating these objects every render of
// ControlButton is wasteful when it renders 4 times per tick.
const controlButtonClasses: Record<"primary" | "secondary" | "danger", string> =
  {
    primary: "border-primary/50 bg-primary/20 text-primary hover:bg-primary/30",
    secondary: "border-white/20 bg-white/10 text-white hover:bg-white/20",
    danger:
      "border-destructive/50 bg-destructive/15 text-destructive hover:bg-destructive/25",
  };

const PREPARE_TOTAL = 3;

// ─── Background image hook ────────────────────────────────────────────────────

/**
 * Returns the image src to display as background.
 *
 * Derives the image index deterministically from `imageKey` using modular
 * arithmetic, so there is no state, no effect, and no extra re-render.
 *
 * imageKey format: "work-{series}" | "rest-{series}" | "work"
 * The series number is used as the index seed, ensuring:
 * - The same phase+series always shows the same image (stable through a phase).
 * - Different series cycle through the pool sequentially.
 */
function usePhaseImage(phase: "work" | "rest", imageKey: string): string {
  return useMemo(() => {
    // Extract the numeric suffix (series number) from the key, if present.
    const parts = imageKey.split("-");
    const seed =
      parts.length > 1 ? parseInt(parts[parts.length - 1], 10) || 0 : 0;

    if (phase === "work") {
      return WORK_IMAGES[seed % WORK_IMAGES.length];
    }
    return REST_IMAGES[seed % REST_IMAGES.length];
  }, [phase, imageKey]);
}

// ─── Portal ───────────────────────────────────────────────────────────────────

// useSyncExternalStore-based client detection: avoids the setState-in-effect
// pattern that the project lint rule react-hooks/set-state-in-effect prohibits.
// On the server the "server snapshot" returns false; on the client it returns
// true immediately, so the portal renders on the first client paint with no
// extra re-render cycle.
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Memoized so it doesn't re-render on every timer tick.
 * The portal itself never moves in the DOM — React reconciles children in-place.
 */
const BodyPortal = memo(function BodyPortal({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMounted = useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot,
  );
  if (!isMounted) return null;
  return createPortal(children, document.body);
});

// ─── Background image layer ───────────────────────────────────────────────────

/**
 * Full-bleed background image that blends with the dark background.
 *
 * Crossfade is driven by a useReducer to collapse the three-setState sequence
 * (setVisible(false) → setTimeout → setActiveSrc + setVisible(true)) into a
 * single dispatch per transition, eliminating the intermediate render where
 * `activeSrc` had already changed but `visible` was still false.
 *
 * The component is memoized: it only re-renders when `src` or `phase` changes
 * (i.e., once per phase transition), never on every timer tick.
 */
type BgState = { activeSrc: string; visible: boolean };
type BgAction = { type: "fade_out" } | { type: "swap"; src: string };

function bgReducer(state: BgState, action: BgAction): BgState {
  switch (action.type) {
    case "fade_out":
      return { ...state, visible: false };
    case "swap":
      return { activeSrc: action.src, visible: true };
    default:
      return state;
  }
}

const BackgroundImage = memo(function BackgroundImage({
  src,
  phase,
}: {
  src: string;
  phase: "work" | "rest";
}) {
  const [state, dispatch] = useReducer(bgReducer, {
    activeSrc: src,
    visible: true,
  });

  useEffect(() => {
    if (src === state.activeSrc) return;
    dispatch({ type: "fade_out" });
    const t = setTimeout(() => {
      dispatch({ type: "swap", src });
    }, 300);
    return () => clearTimeout(t);
    // state.activeSrc intentionally omitted: we only care about src changing.
    // Including activeSrc would re-trigger on the swap dispatch itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <Image
        key={state.activeSrc}
        src={state.activeSrc}
        alt=""
        fill
        priority
        sizes="100vw"
        className={`object-cover transition-opacity duration-300 ${
          state.visible ? "opacity-100" : "opacity-0"
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
});

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Memoized: only re-renders when `mm`, `ss`, or `tone` actually changes.
 * Without memo this re-renders on every 250ms tick even when the displayed
 * second hasn't changed (the interval fires 4× per second but the visible
 * value only changes once per second).
 */
const FullscreenDigits = memo(function FullscreenDigits({
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
});

const PrepareScreen = memo(function PrepareScreen({
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
});

/**
 * Memoized: re-renders only when `percent` or `tone` change.
 * The progress bar width changes once per second, not 4× per second,
 * because `progressPercent` is derived with Math.round() in series-timer.
 */
const FullscreenProgressBar = memo(function FullscreenProgressBar({
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
});

/**
 * Memoized with a custom comparator: only re-renders when series number or
 * phase actually changes, not when the parent re-renders due to a tick.
 */
const SeriesBadge = memo(
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
  },
  // Custom comparator: skip re-render when meta values haven't changed.
  // meta is a new object reference every 250ms from the parent; without this
  // comparator memo() would never bail out.
  (prev, next) =>
    prev.meta.currentSeries === next.meta.currentSeries &&
    prev.meta.totalSeries === next.meta.totalSeries &&
    prev.meta.phase === next.meta.phase,
);

/**
 * Memoized with the same value-equality comparator as SeriesBadge.
 */
const SeriesProgressDots = memo(
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
  },
  (prev, next) =>
    prev.meta.currentSeries === next.meta.currentSeries &&
    prev.meta.totalSeries === next.meta.totalSeries &&
    prev.meta.phase === next.meta.phase,
);

/**
 * Memoized: buttons are purely presentational and their handlers are stable
 * useCallbacks. Without memo they'd re-render 4× per second for nothing.
 */
const ControlButton = memo(function ControlButton({
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
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative inline-flex min-h-14 min-w-14 items-center justify-center gap-2.5 rounded-2xl border px-6 text-base font-bold transition-colors ${controlButtonClasses[variant]}`}
    >
      {children}
    </button>
  );
});

// ─── Overlay content ──────────────────────────────────────────────────────────

/**
 * Memoized: the entire overlay re-renders only when props change.
 * Heavy child components (FullscreenDigits, BackgroundImage, SeriesBadge,
 * SeriesProgressDots) are themselves memoized so they skip unnecessary work
 * even when OverlayContent does re-render due to a tick update.
 */
const OverlayContent = memo(function OverlayContent({
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

  // Determine the phase for image selection.
  // Series timer provides seriesMeta.phase; countdown timer always uses "work".
  const phase: "work" | "rest" = seriesMeta?.phase === "rest" ? "rest" : "work";

  // imageKey changes once per phase transition — drives the image swap.
  // For series: "work-{series}" or "rest-{series}".
  // For countdown: always "work" (single phase, single image for the session).
  const imageKey = seriesMeta
    ? `${seriesMeta.phase}-${seriesMeta.currentSeries}`
    : "work";

  // usePhaseImage is now synchronous (no setState inside) so no extra render.
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
});

// ─── Main export ──────────────────────────────────────────────────────────────

export function FullscreenDisplay(props: FullscreenDisplayProps) {
  if (!props.isFullscreen) return null;

  return (
    <BodyPortal>
      <OverlayContent {...props} />
    </BodyPortal>
  );
}
