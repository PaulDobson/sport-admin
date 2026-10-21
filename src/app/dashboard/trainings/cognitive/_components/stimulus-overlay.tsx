/**
 * StimulusOverlay — pantalla de ejecución cognitiva
 *
 * Layout:
 * ┌────────────────────────────────────────────────────────────┐
 * │ BARRA DE PROGRESO — fija top:0, h-5, visible desde lejos  │
 * ├────────────────────────────────────────────────────────────┤
 * │ HEADER: fase + "Serie N/M" + dots + [Salir]               │
 * ├────────────────────────────────────────────────────────────┤
 * │                                                            │
 * │  TRABAJO → estímulo SVG, max(70vw, 70vh), centrado        │
 * │  DESCANSO → imagen REST de fondo + cronómetro mm:ss       │
 * │                                                            │
 * ├────────────────────────────────────────────────────────────┤
 * │ CONTROLES — absolute bottom-0, siempre en el mismo lugar  │
 * └────────────────────────────────────────────────────────────┘
 *
 * Memoización: los sub-componentes sólo re-renderizan cuando sus
 * valores cambian, no en cada tick de 100ms.
 */

"use client";

import {
  memo,
  useEffect,
  useMemo,
  useReducer,
  useSyncExternalStore,
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
import { StimulusSVG } from "./stimulus-svg";
import type {
  CognitiveRuntimeState,
  CognitiveStatus,
} from "./use-cognitive-timer";
import type { Stimulus } from "@/domain/cognitive-training/cognitive-exercise";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StimulusOverlayProps {
  containerRef: RefObject<HTMLDivElement | null>;
  isFullscreen: boolean;
  mm: string;
  ss: string;
  status: CognitiveStatus;
  runtime: CognitiveRuntimeState;
  totalSeries: number;
  progressPercent: number;
  isPreparing: boolean;
  prepareSecondsLeft: number;
  activeStimulus: Stimulus | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
  onExitFullscreen: () => void;
}

// ─── Image pools (mismos que fullscreen-display.tsx) ─────────────────────────

const REST_IMAGES = [
  "/rest/descanso_1.jpg",
  "/rest/descanso_2.jpg",
  "/rest/descanso_3.jpg",
] as const;

// ─── Background image (crossfade — copiado de fullscreen-display.tsx) ────────

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

/**
 * Imagen de fondo con crossfade. Solo se muestra durante el descanso.
 * Se memoiza para no re-renderizar en cada tick.
 */
const BackgroundImage = memo(function BackgroundImage({
  src,
}: {
  src: string;
}) {
  const [state, dispatch] = useReducer(bgReducer, {
    activeSrc: src,
    visible: true,
  });

  useEffect(() => {
    if (src === state.activeSrc) return;
    dispatch({ type: "fade_out" });
    const t = setTimeout(() => dispatch({ type: "swap", src }), 300);
    return () => clearTimeout(t);
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
        className={`object-cover mix-blend-luminosity transition-opacity duration-300 ${
          state.visible ? "opacity-[0.15]" : "opacity-0"
        }`}
      />
      {/* Gradiente para que los dígitos siempre contrasten */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#181c2a]/85 via-[#181c2a]/50 to-[#181c2a]/65" />
    </div>
  );
});

// ─── Portal helper (misma técnica que fullscreen-display.tsx) ─────────────────

const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PREPARE_TOTAL = 3;

/**
 * Selecciona la imagen REST de forma determinista según el número de serie,
 * igual que usePhaseImage en fullscreen-display.tsx.
 */
function useRestImage(currentSeries: number): string {
  return useMemo(
    () => REST_IMAGES[(currentSeries - 1) % REST_IMAGES.length],
    [currentSeries],
  );
}

// ─── Top progress bar ─────────────────────────────────────────────────────────

const TopProgressBar = memo(
  function TopProgressBar({
    percent,
    phase,
  }: {
    percent: number;
    phase: "work" | "rest";
  }) {
    return (
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de la fase actual"
        className="absolute inset-x-0 top-0 z-10 h-5 bg-white/8"
      >
        <div
          className={`h-full transition-all duration-300 ${
            phase === "work" ? "bg-primary" : "bg-warning"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  },
  (prev, next) => prev.percent === next.percent && prev.phase === next.phase,
);

// ─── Prepare screen ───────────────────────────────────────────────────────────

const PrepareScreen = memo(function PrepareScreen({
  secondsLeft,
  onStop,
}: {
  secondsLeft: number;
  onStop: () => void;
}) {
  const progressPercent = Math.round(
    ((PREPARE_TOTAL - secondsLeft) / PREPARE_TOTAL) * 100,
  );

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 px-6">
      <div className="absolute inset-x-0 top-0 h-5 bg-white/8" />

      <div className="absolute right-4 top-6">
        <button
          type="button"
          onClick={onStop}
          aria-label="Cancelar y salir"
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
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
        style={{ fontSize: "clamp(10rem, 40vw, 20rem)" }}
      >
        {secondsLeft}
      </div>

      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de preparación"
        className="h-3 w-full max-w-sm overflow-hidden rounded-full bg-white/10"
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
    </div>
  );
});

// ─── Series header — Opción C: chip compacto unificado ───────────────────────
//
// Un solo bloque cohesivo con tres secciones separadas por divisores:
//   [ Ícono + Fase ]  |  [ Serie N / M ]  |  [ dots de progreso ]
//
// El chip es oscuro con glow sutil del color de la fase para no competir
// con el estímulo. Los dots se representan como píldoras rectangulares:
// el activo se alarga para diferenciarse claramente desde lejos.

const SeriesHeader = memo(
  function SeriesHeader({
    currentSeries,
    totalSeries,
    phase,
    isDone,
    onExitFullscreen,
  }: {
    currentSeries: number;
    totalSeries: number;
    phase: "work" | "rest";
    isDone: boolean;
    onExitFullscreen: () => void;
  }) {
    const isWork = phase === "work";
    const Icon = isWork ? Dumbbell : Coffee;
    const phaseLabel = isWork ? "Trabajo" : "Descanso";

    // Colores por fase
    const iconGlow = isWork
      ? "bg-primary/20 shadow-[0_0_14px_rgba(91,138,255,0.4)]"
      : "bg-warning/20 shadow-[0_0_14px_rgba(251,191,36,0.4)]";
    const phaseText = isWork ? "text-primary" : "text-warning";
    const countText = isWork ? "text-primary" : "text-warning";
    const countGlow = isWork
      ? "[text-shadow:0_0_24px_rgba(91,138,255,0.55)]"
      : "[text-shadow:0_0_24px_rgba(251,191,36,0.45)]";
    const chipBorder = isWork ? "border-primary/15" : "border-warning/15";
    const chipGlow = isWork
      ? "shadow-[0_0_32px_rgba(91,138,255,0.12)]"
      : "shadow-[0_0_32px_rgba(251,191,36,0.1)]";
    const topEdge = isWork ? "from-primary/20" : "from-warning/15";
    const dotActive = isWork
      ? "bg-primary shadow-[0_0_10px_rgba(91,138,255,0.7)]"
      : "bg-warning shadow-[0_0_10px_rgba(251,191,36,0.6)]";
    const dotDone = isWork ? "bg-primary/45" : "bg-warning/40";

    return (
      <div className="relative z-10 flex w-full items-center justify-between gap-4 px-5 pt-7">
        {/* ── Chip compacto ─────────────────────────────────────────────── */}
        {isDone ? (
          /* Estado completado */
          <div className="inline-flex items-center gap-3 rounded-2xl border border-success/30 bg-[rgba(20,24,40,0.80)] px-5 py-2.5 shadow-[0_0_28px_rgba(52,211,153,0.15)] backdrop-blur-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/20 shadow-[0_0_12px_rgba(52,211,153,0.4)]">
              <Dumbbell aria-hidden="true" className="h-5 w-5 text-success" />
            </div>
            <span className="text-lg font-black tracking-wide text-success sm:text-xl">
              ¡Completado!
            </span>
          </div>
        ) : (
          <div
            className={`relative inline-flex items-stretch overflow-hidden rounded-2xl border bg-[rgba(20,24,40,0.80)] backdrop-blur-md ${chipBorder} ${chipGlow}`}
          >
            {/* Línea superior con gradiente del color de fase */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent ${topEdge} to-transparent`}
            />

            {/* Sección 1 — Ícono + Fase */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconGlow}`}
              >
                <Icon aria-hidden="true" className={`h-5 w-5 ${phaseText}`} />
              </div>
              <span
                className={`text-lg font-black uppercase tracking-[0.12em] ${phaseText}`}
              >
                {phaseLabel}
              </span>
            </div>

            {/* Divisor */}
            <div
              aria-hidden="true"
              className="w-px self-stretch bg-white/[0.07]"
            />

            {/* Sección 2 — Contador N / M */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              aria-label={`Serie ${currentSeries} de ${totalSeries}`}
            >
              <span className="text-[1.5rem] font-black uppercase tracking-[0.14em] text-white/30">
                Serie
              </span>
              <span
                className={`metric-number text-[3.5rem] font-black leading-none ${countText} ${countGlow}`}
              >
                {currentSeries}
              </span>
              <span className="text-base font-bold text-white/20">/</span>
              <span className="metric-number text-[3rem] font-bold leading-none text-white/35">
                {totalSeries}
              </span>
            </div>

            {/* Divisor */}
            <div
              aria-hidden="true"
              className="w-px self-stretch bg-white/[0.07]"
            />

            {/* Sección 3 — Dots de progreso como píldoras */}
            <div
              aria-hidden="true"
              className="flex items-center gap-1.5 px-4 py-3"
            >
              {Array.from({ length: totalSeries }, (_, i) => {
                const n = i + 1;
                const completed = n < currentSeries;
                const current = n === currentSeries;

                if (current) {
                  return (
                    <div
                      key={i}
                      className={`h-2.5 w-6 rounded-sm transition-all duration-500 ${dotActive}`}
                    />
                  );
                }
                if (completed) {
                  return (
                    <div
                      key={i}
                      className={`h-2.5 w-2.5 rounded-sm transition-all duration-500 ${dotDone}`}
                    />
                  );
                }
                return (
                  <div
                    key={i}
                    className="h-2.5 w-2.5 rounded-sm bg-white/12 transition-all duration-500"
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── Botón salir ───────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={onExitFullscreen}
          aria-label="Salir de pantalla completa"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
        >
          <Minimize2 aria-hidden="true" className="h-4 w-4" />
          Salir
        </button>
      </div>
    );
  },
  (prev, next) =>
    prev.currentSeries === next.currentSeries &&
    prev.totalSeries === next.totalSeries &&
    prev.phase === next.phase &&
    prev.isDone === next.isDone,
);

// ─── Rest content (imagen + cronómetro) ──────────────────────────────────────

/**
 * Durante el descanso se muestra:
 * - Imagen REST de fondo con crossfade (igual que series-timer)
 * - Cronómetro mm:ss grande y centrado (color warning)
 * El instructor y el alumno pueden ver cuánto tiempo de descanso queda.
 */
const RestContent = memo(
  function RestContent({
    mm,
    ss,
    currentSeries,
  }: {
    mm: string;
    ss: string;
    currentSeries: number;
  }) {
    const restImageSrc = useRestImage(currentSeries);

    return (
      <>
        <BackgroundImage src={restImageSrc} />
        <div
          className="relative z-10 flex flex-1 items-center justify-center pb-24"
          aria-live="off"
          aria-atomic="true"
        >
          <div
            className="metric-number select-none text-center font-bold leading-none tracking-tight text-warning"
            style={{ fontSize: "clamp(7rem, 28vw, 22rem)" }}
          >
            <span aria-label={`${mm} minutos`}>{mm}</span>
            <span aria-hidden="true" className="mx-2 opacity-40">
              :
            </span>
            <span aria-label={`${ss} segundos`}>{ss}</span>
          </div>
        </div>
      </>
    );
  },
  (prev, next) =>
    prev.mm === next.mm &&
    prev.ss === next.ss &&
    prev.currentSeries === next.currentSeries,
);

// ─── Work content (estímulo SVG) ──────────────────────────────────────────────

/**
 * Durante el trabajo se muestra el estímulo SVG ocupando el máximo espacio.
 * Sin imagen de fondo — el fondo oscuro hace que el estímulo destaque más.
 */
const WorkContent = memo(
  function WorkContent({ stimulus }: { stimulus: Stimulus | null }) {
    if (!stimulus) {
      // Gap entre estímulos: espacio reservado para que los controles no salten
      return <div aria-hidden="true" className="flex-1 pb-24" />;
    }

    return (
      <div className="flex flex-1 items-center justify-center p-6 pb-24">
        <div
          key={stimulus.id}
          aria-live="assertive"
          aria-atomic="true"
          aria-label={
            stimulus.kind === "color"
              ? `Estímulo: ${stimulus.label}`
              : stimulus.kind === "letter"
                ? `Letra: ${stimulus.label}`
                : `Número: ${stimulus.label}`
          }
          className="aspect-square w-full"
          style={{
            maxWidth: "min(70vw, 70vh)",
            animation: "stimulusEntrance 160ms ease-out both",
          }}
        >
          <StimulusSVG
            stimulus={stimulus}
            className="h-full w-full drop-shadow-2xl"
            letterColor="#ffffff"
            numberColor="#ffffff"
            arrowColor="#ffffff"
            soundColor="#ffffff"
          />
        </div>
      </div>
    );
  },
  (prev, next) => prev.stimulus?.id === next.stimulus?.id,
);

// ─── Control button ───────────────────────────────────────────────────────────

const controlBtnCls = {
  primary: "border-primary/50 bg-primary/20 text-primary hover:bg-primary/30",
  secondary: "border-white/20 bg-white/10 text-white hover:bg-white/20",
  danger:
    "border-destructive/50 bg-destructive/15 text-destructive hover:bg-destructive/25",
};

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
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center gap-2.5 rounded-2xl border px-5 py-3 text-base font-bold transition-colors ${controlBtnCls[variant]}`}
    >
      {children}
    </button>
  );
}

// ─── Running overlay ──────────────────────────────────────────────────────────

const RunningOverlayContent = memo(function RunningOverlayContent({
  mm,
  ss,
  status,
  runtime,
  totalSeries,
  progressPercent,
  activeStimulus,
  onPause,
  onResume,
  onStop,
  onRestart,
  onExitFullscreen,
}: {
  mm: string;
  ss: string;
  status: CognitiveStatus;
  runtime: CognitiveRuntimeState;
  totalSeries: number;
  progressPercent: number;
  activeStimulus: Stimulus | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
  onExitFullscreen: () => void;
}) {
  const isDone = status === "done";
  const isWork = runtime.phase === "work";

  return (
    <>
      {/* Barra de progreso — siempre fija en top */}
      <TopProgressBar percent={progressPercent} phase={runtime.phase} />

      {/* Header con fase + serie + dots + salir */}
      <SeriesHeader
        currentSeries={runtime.currentSeries}
        totalSeries={totalSeries}
        phase={runtime.phase}
        isDone={isDone}
        onExitFullscreen={onExitFullscreen}
      />

      {/* Contenido central — trabajo o descanso */}
      {isWork ? (
        <WorkContent stimulus={activeStimulus} />
      ) : (
        <RestContent mm={mm} ss={ss} currentSeries={runtime.currentSeries} />
      )}

      {/* Controles — absolute bottom, nunca participan en el flujo flex */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-center gap-3 bg-gradient-to-t from-background/95 via-background/60 to-transparent px-5 pb-6 pt-8">
        {status === "running" && (
          <ControlButton onClick={onPause} label="Pausar" variant="secondary">
            <Pause aria-hidden="true" className="h-5 w-5 fill-current" />
            Pausar
          </ControlButton>
        )}
        {status === "paused" && (
          <ControlButton onClick={onResume} label="Reanudar" variant="primary">
            <Play aria-hidden="true" className="h-5 w-5 fill-current" />
            Reanudar
          </ControlButton>
        )}
        {(status === "running" || status === "paused") && (
          <ControlButton
            onClick={onRestart}
            label="Reiniciar desde el inicio"
            variant="secondary"
          >
            <RotateCcw aria-hidden="true" className="h-5 w-5" />
            Reiniciar
          </ControlButton>
        )}
        {status !== "idle" && (
          <ControlButton
            onClick={onStop}
            label={
              status === "done" ? "Volver a configuración" : "Detener ejercicio"
            }
            variant="danger"
          >
            {status === "done" ? (
              <>
                <RotateCcw aria-hidden="true" className="h-5 w-5" />
                Volver
              </>
            ) : (
              <>
                <Square aria-hidden="true" className="h-5 w-5 fill-current" />
                Detener
              </>
            )}
          </ControlButton>
        )}
      </div>
    </>
  );
});

// ─── Overlay content dispatcher ───────────────────────────────────────────────

const OverlayContent = memo(function OverlayContent(
  props: Omit<StimulusOverlayProps, "containerRef" | "isFullscreen">,
) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      <style>{`
        @keyframes stimulusEntrance {
          from { opacity: 0; transform: scale(0.75); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {props.isPreparing ? (
        <PrepareScreen
          secondsLeft={props.prepareSecondsLeft}
          onStop={props.onStop}
        />
      ) : (
        <RunningOverlayContent
          mm={props.mm}
          ss={props.ss}
          status={props.status}
          runtime={props.runtime}
          totalSeries={props.totalSeries}
          progressPercent={props.progressPercent}
          activeStimulus={props.activeStimulus}
          onPause={props.onPause}
          onResume={props.onResume}
          onStop={props.onStop}
          onRestart={props.onRestart}
          onExitFullscreen={props.onExitFullscreen}
        />
      )}
    </div>
  );
});

// ─── Main export ──────────────────────────────────────────────────────────────

export function StimulusOverlay({
  containerRef,
  isFullscreen,
  ...rest
}: StimulusOverlayProps) {
  if (!isFullscreen) return <div ref={containerRef} />;

  return (
    <>
      <div ref={containerRef} />
      <BodyPortal>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ejercicio cognitivo en pantalla completa"
          className="fixed inset-0 z-[9999] overflow-hidden"
          style={{ backgroundColor: "var(--background)" }}
        >
          <OverlayContent {...rest} />
        </div>
      </BodyPortal>
    </>
  );
}
