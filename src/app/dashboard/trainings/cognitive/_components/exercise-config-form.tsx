"use client";

import {
  memo,
  useState,
  useCallback,
  useTransition,
  useId,
  useEffect,
  useRef,
  useSyncExternalStore,
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
  Trash2,
  Dumbbell,
  Coffee,
  Repeat2,
  Clock,
  Eye,
  BookOpen,
  SlidersHorizontal,
  Volume2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/presentation/components/primitives";
import { StimulusSelector } from "./stimulus-selector";
import { saveExerciseAction, deleteExerciseAction } from "../actions";
import { getStimulusById, STIMULUS_CATEGORIES } from "./stimulus-data";
import { ArrowStimulusSVG, SoundStimulusSVG } from "./stimulus-svg";
import type { CognitiveExercise } from "@/domain/cognitive-training/cognitive-exercise";
import type {
  CognitiveSeriesConfig,
  CognitiveStatus,
  StimulusTimingConfig,
} from "./use-cognitive-timer";
import { clamp, phaseDuration } from "./use-cognitive-timer";
import type {
  ArrowStimulus,
  ColorStimulus,
  LetterStimulus,
  NumberStimulus,
  SoundStimulus,
} from "@/domain/cognitive-training/cognitive-exercise";

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

type TabId = "config" | "saved";

// ─── Stable module-level constants for the SSR portal guard ──────────────────
// Same pattern as stimulus-overlay.tsx. Module-level constants avoid creating
// new function references on every render call to useSyncExternalStore.

const _subscribeNoop = () => () => {};
const _getClientSnapshot = () => true;
const _getServerSnapshot = () => false;

function useIsMounted(): boolean {
  return useSyncExternalStore(
    _subscribeNoop,
    _getClientSnapshot,
    _getServerSnapshot,
  );
}

interface SummaryModalProps {
  isOpen: boolean;
  exerciseName: string;
  seriesConfig: CognitiveSeriesConfig;
  stimulusTiming: StimulusTimingConfig;
  selectedIds: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

function SummaryStatItem({
  icon: Icon,
  iconBg,
  label,
  value,
}: {
  icon: typeof Repeat2;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface-raised/50 px-5 py-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Icon aria-hidden="true" className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-xl font-black text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SummaryStimuli({ ids }: { ids: string[] }) {
  // Group by category maintaining order
  const groups = STIMULUS_CATEGORIES.map((cat) => ({
    cat,
    stimuli: ids
      .map((id) => getStimulusById(id))
      .filter((s) => s?.kind === cat.id),
  })).filter((g) => g.stimuli.length > 0);

  const accentMap: Record<string, string> = {
    color: "text-violet-400",
    letter: "text-sky-400",
    number: "text-emerald-400",
    arrow: "text-orange-400",
    sound: "text-pink-400",
  };

  return (
    <div className="space-y-3">
      {groups.map(({ cat, stimuli }) => (
        <div key={cat.id} className="flex flex-wrap items-center gap-2">
          <span
            className={`shrink-0 text-xs font-black uppercase tracking-widest ${accentMap[cat.id] ?? "text-muted-foreground"}`}
          >
            {cat.label}
          </span>
          <span className="text-muted-foreground/40">·</span>
          {stimuli.map((s) => (
            <StimulusSummaryDot key={s!.id} id={s!.id} />
          ))}
        </div>
      ))}
    </div>
  );
}

function StimulusSummaryDot({ id }: { id: string }) {
  const stimulus = getStimulusById(id);
  if (!stimulus) return null;

  const accent = CAT_ACCENT[stimulus.kind] ?? {
    bg: "bg-muted/20",
    border: "border-border",
    text: "text-muted-foreground",
  };

  return (
    <span
      title={stimulus.label}
      className={`inline-flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 ${accent.bg} ${accent.border}`}
    >
      {stimulus.kind === "color" && (
        <span
          className="h-5 w-5 rounded-full shadow"
          style={{ backgroundColor: (stimulus as ColorStimulus).hex }}
        />
      )}
      {stimulus.kind === "letter" && (
        <span className={`text-base font-black leading-none ${accent.text}`}>
          {(stimulus as LetterStimulus).glyph}
        </span>
      )}
      {stimulus.kind === "number" && (
        <span className={`text-base font-black leading-none ${accent.text}`}>
          {(stimulus as NumberStimulus).glyph}
        </span>
      )}
      {stimulus.kind === "arrow" && (
        <ArrowStimulusSVG
          stimulus={stimulus as ArrowStimulus}
          className="h-5 w-5"
          color="#fb923c"
        />
      )}
      {stimulus.kind === "sound" && (
        <SoundStimulusSVG
          stimulus={stimulus as SoundStimulus}
          className="h-5 w-5"
          color="#f472b6"
        />
      )}
    </span>
  );
}

function ExerciseSummaryModal({
  isOpen,
  exerciseName,
  seriesConfig,
  stimulusTiming,
  selectedIds,
  onConfirm,
  onCancel,
}: SummaryModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Only render in the browser — avoids SSR/hydration mismatch for portals
  const isMounted = useIsMounted();

  // Focus confirm button when modal opens
  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => confirmRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen || !isMounted) return null;

  const workSecs = phaseDuration(seriesConfig, "work");
  const restSecs = phaseDuration(seriesConfig, "rest");
  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} min`;
  const cycleMs =
    stimulusTiming.displayDurationMs + stimulusTiming.gapDurationMs;

  return createPortal(
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
              Resumen del ejercicio
            </p>
            <h2
              id="summary-modal-title"
              className="mt-1 text-2xl font-black text-foreground"
            >
              {exerciseName || "Ejercicio sin nombre"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar resumen"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-raised/60 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryStatItem
              icon={Repeat2}
              iconBg="bg-primary/15 text-primary"
              label="Series"
              value={String(seriesConfig.totalSeries)}
            />
            <SummaryStatItem
              icon={Dumbbell}
              iconBg="bg-primary/15 text-primary"
              label="Trabajo"
              value={fmtTime(workSecs)}
            />
            <SummaryStatItem
              icon={Coffee}
              iconBg="bg-warning/15 text-warning"
              label="Descanso"
              value={fmtTime(restSecs)}
            />
            <SummaryStatItem
              icon={Clock}
              iconBg="bg-violet-500/15 text-violet-400"
              label="Ciclo estímulo"
              value={`${(cycleMs / 1000).toFixed(1)} s`}
            />
          </div>

          {/* Stimuli */}
          <div className="rounded-2xl border border-border bg-surface-raised/40 px-5 py-4">
            <div className="mb-3 flex items-center gap-2.5">
              <Eye aria-hidden="true" className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
                Estímulos seleccionados
              </span>
              <span className="ml-auto rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                {selectedIds.length}
              </span>
            </div>
            <SummaryStimuli ids={selectedIds} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border bg-surface-raised/60 px-5 py-2.5 text-base font-semibold text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            Volver a editar
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2.5 rounded-xl bg-primary px-6 py-2.5 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Maximize2 aria-hidden="true" className="h-5 w-5" />
            Comenzar ejercicio
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  activeTab,
  savedCount,
  onSelect,
}: {
  activeTab: TabId;
  savedCount: number;
  onSelect: (tab: TabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Secciones del ejercicio cognitivo"
      className="flex rounded-2xl border border-border bg-surface-raised/40 p-1"
    >
      <TabButton
        tabId="config"
        activeTab={activeTab}
        icon={SlidersHorizontal}
        label="Configurar"
        onSelect={onSelect}
      />
      <TabButton
        tabId="saved"
        activeTab={activeTab}
        icon={BookOpen}
        label="Mis ejercicios"
        badge={savedCount > 0 ? String(savedCount) : undefined}
        onSelect={onSelect}
      />
    </div>
  );
}

function TabButton({
  tabId,
  activeTab,
  icon: Icon,
  label,
  badge,
  onSelect,
}: {
  tabId: TabId;
  activeTab: TabId;
  icon: typeof SlidersHorizontal;
  label: string;
  badge?: string;
  onSelect: (tab: TabId) => void;
}) {
  const isActive = tabId === activeTab;
  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls={`tab-panel-${tabId}`}
      id={`tab-btn-${tabId}`}
      onClick={() => onSelect(tabId)}
      className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-base font-bold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        isActive
          ? "bg-card text-foreground shadow-sm shadow-black/10"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <span>{label}</span>
      {badge && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-black leading-none ${
            isActive
              ? "bg-primary/20 text-primary"
              : "bg-muted/40 text-muted-foreground"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Category accent map ──────────────────────────────────────────────────────

const CAT_ACCENT: Record<string, { bg: string; border: string; text: string }> =
  {
    color: {
      bg: "bg-violet-500/10",
      border: "border-violet-500/30",
      text: "text-violet-400",
    },
    letter: {
      bg: "bg-sky-500/10",
      border: "border-sky-500/30",
      text: "text-sky-400",
    },
    number: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
    },
    arrow: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-400",
    },
    sound: {
      bg: "bg-pink-500/10",
      border: "border-pink-500/30",
      text: "text-pink-400",
    },
  };

// ─── Stimulus dot (mini preview) ─────────────────────────────────────────────

function StimulusDot({ id }: { id: string }) {
  const stimulus = getStimulusById(id);
  if (!stimulus) return null;

  const accent = CAT_ACCENT[stimulus.kind] ?? {
    bg: "bg-muted/20",
    border: "border-border",
    text: "text-muted-foreground",
  };

  return (
    <span
      title={stimulus.label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${accent.bg} ${accent.border}`}
    >
      {stimulus.kind === "color" && (
        <span
          className="h-5 w-5 rounded-full"
          style={{ backgroundColor: (stimulus as ColorStimulus).hex }}
        />
      )}
      {stimulus.kind === "letter" && (
        <span className={`text-sm font-black leading-none ${accent.text}`}>
          {(stimulus as LetterStimulus).glyph}
        </span>
      )}
      {stimulus.kind === "number" && (
        <span className={`text-sm font-black leading-none ${accent.text}`}>
          {(stimulus as NumberStimulus).glyph}
        </span>
      )}
      {stimulus.kind === "arrow" && (
        <ArrowStimulusSVG
          stimulus={stimulus as ArrowStimulus}
          className="h-5 w-5"
          color="#fb923c"
        />
      )}
      {stimulus.kind === "sound" && (
        <SoundStimulusSVG
          stimulus={stimulus as SoundStimulus}
          className="h-5 w-5"
          color="#f472b6"
        />
      )}
    </span>
  );
}

// ─── Stimulus preview strip ───────────────────────────────────────────────────

const StimulusPreviewStrip = memo(function StimulusPreviewStrip({
  ids,
}: {
  ids: string[];
}) {
  if (ids.length === 0) {
    return (
      <span className="italic text-xs text-muted-foreground/50">
        Sin estímulos
      </span>
    );
  }

  const flat = STIMULUS_CATEGORIES.flatMap((cat) =>
    ids.filter((id) => getStimulusById(id)?.kind === cat.id),
  );

  const MAX_DOTS = 8;
  const visible = flat.slice(0, MAX_DOTS);
  const overflow = flat.length - MAX_DOTS;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((id) => (
        <StimulusDot key={id} id={id} />
      ))}
      {overflow > 0 && (
        <span className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-full border border-border bg-surface-raised px-2 text-xs font-bold text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
});

// ─── Saved exercises table ────────────────────────────────────────────────────

const SavedExercisesTable = memo(
  function SavedExercisesTable({
    exercises,
    currentId,
    isPending,
    onLoad,
    onDelete,
  }: {
    exercises: CognitiveExercise[];
    currentId: string | null;
    isPending: boolean;
    onLoad: (ex: CognitiveExercise) => void;
    onDelete: (id: string) => void;
  }) {
    if (exercises.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <BookOpen
            aria-hidden="true"
            className="h-12 w-12 text-muted-foreground/20"
          />
          <p className="text-base font-semibold text-muted-foreground">
            Aún no hay ejercicios guardados.
          </p>
          <p className="text-sm text-muted-foreground/60">
            Ve a <strong>Configurar</strong>, ajusta los parámetros y guarda tu
            primer ejercicio.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-border">
        {/* ── Mobile: cards apiladas ── */}
        <ul
          className="divide-y divide-border sm:hidden"
          aria-label="Ejercicios guardados"
        >
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
                className={`px-4 py-4 transition-colors ${
                  isCurrent ? "bg-primary/[0.07]" : "bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`flex items-center gap-2 truncate text-base font-bold ${
                        isCurrent ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {isCurrent && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      {ex.config.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {ex.config.seriesConfig.totalSeries} series · {mm}:{ss}{" "}
                      trabajo
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoad(ex)}
                      disabled={isPending}
                      aria-label={`Cargar ${ex.config.name}`}
                      className="rounded-lg border border-border bg-surface-raised/60 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cargar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(ex.id)}
                      disabled={isPending}
                      aria-label={`Eliminar ${ex.config.name}`}
                      className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <StimulusPreviewStrip ids={ex.config.selectedStimulusIds} />
                </div>
              </li>
            );
          })}
        </ul>

        {/* ── Desktop: tabla ── */}
        <table
          className="hidden w-full text-sm sm:table"
          aria-label="Ejercicios guardados"
        >
          <thead>
            <tr className="border-b border-border bg-surface-raised/50">
              <th
                scope="col"
                className="px-5 py-3.5 text-left text-xs font-black uppercase tracking-[0.12em] text-muted-foreground"
              >
                Nombre
              </th>
              <th
                scope="col"
                className="hidden px-5 py-3.5 text-center text-xs font-black uppercase tracking-[0.12em] text-muted-foreground md:table-cell"
              >
                Series
              </th>
              <th
                scope="col"
                className="hidden px-5 py-3.5 text-center text-xs font-black uppercase tracking-[0.12em] text-muted-foreground lg:table-cell"
              >
                Trabajo
              </th>
              <th
                scope="col"
                className="px-5 py-3.5 text-left text-xs font-black uppercase tracking-[0.12em] text-muted-foreground"
              >
                Estímulos
              </th>
              <th scope="col" className="w-px px-5 py-3.5">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {exercises.map((ex) => {
              const isCurrent = ex.id === currentId;
              const workSecs =
                ex.config.seriesConfig.workMinutes * 60 +
                ex.config.seriesConfig.workSeconds;
              const mm = String(Math.floor(workSecs / 60)).padStart(2, "0");
              const ss = String(workSecs % 60).padStart(2, "0");

              return (
                <tr
                  key={ex.id}
                  className={`transition-colors ${
                    isCurrent
                      ? "bg-primary/[0.06]"
                      : "bg-card hover:bg-surface-raised/40"
                  }`}
                >
                  {/* Nombre */}
                  <td className="max-w-[200px] px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      {isCurrent && (
                        <span
                          aria-label="Ejercicio activo"
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                      <span
                        className={`truncate text-base font-bold ${
                          isCurrent ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {ex.config.name}
                      </span>
                    </div>
                  </td>
                  {/* Series */}
                  <td className="hidden px-5 py-4 text-center md:table-cell">
                    <span className="rounded-lg bg-surface-raised px-3 py-1 text-sm font-bold text-foreground">
                      {ex.config.seriesConfig.totalSeries}
                    </span>
                  </td>
                  {/* Trabajo */}
                  <td className="hidden px-5 py-4 text-center lg:table-cell">
                    <span className="font-mono text-sm font-bold text-primary">
                      {mm}:{ss}
                    </span>
                  </td>
                  {/* Estímulos */}
                  <td className="px-5 py-4">
                    <StimulusPreviewStrip ids={ex.config.selectedStimulusIds} />
                  </td>
                  {/* Acciones */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onLoad(ex)}
                        disabled={isPending}
                        aria-label={`Cargar ${ex.config.name}`}
                        className="rounded-lg border border-border bg-surface-raised/60 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cargar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(ex.id)}
                        disabled={isPending}
                        aria-label={`Eliminar ${ex.config.name}`}
                        className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  },
  // Custom comparator: only re-render when the list, active id, or pending
  // state actually change. Callback references are stable (useCallback in
  // ExerciseConfigForm), so we skip comparing them here.
  (prev, next) =>
    prev.isPending === next.isPending &&
    prev.currentId === next.currentId &&
    prev.exercises === next.exercises,
);

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
      className={`rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/10 sm:p-5 ${className ?? ""}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <span className="text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
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

// ─── Control buttons ──────────────────────────────────────────────────────────

function ControlButtons({
  status,
  canStartWithStimuli,
  onRequestStart,
  onStart,
  onPause,
  onResume,
  onStop,
  onRestart,
  buttonClassName,
}: {
  status: CognitiveStatus;
  canStartWithStimuli: boolean;
  /** Opens the summary modal before starting (idle / done) */
  onRequestStart: () => void;
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
          onClick={onRequestStart}
          disabled={!canStartWithStimuli}
          className={`${buttonClassName} gap-2`}
          aria-label="Ver resumen e iniciar ejercicio"
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

export const ExerciseConfigForm = memo(function ExerciseConfigForm({
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
  const uid = useId();
  const [activeTab, setActiveTab] = useState<TabId>("config");
  const [exerciseName, setExerciseName] = useState("Mi ejercicio cognitivo");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showSummary, setShowSummary] = useState(false);

  const canStartWithStimuli = canStart && selectedIds.length > 0;
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

  // ── Load — switches to config tab so the user sees what loaded ─────────────
  const handleLoad = useCallback(
    (ex: CognitiveExercise) => {
      onLoadExercise(ex);
      setExerciseName(ex.config.name);
      onSetCurrentExerciseId(ex.id);
      setActiveTab("config");
    },
    [onLoadExercise, onSetCurrentExerciseId],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ── Summary modal ─────────────────────────────────────────────────── */}
      <ExerciseSummaryModal
        isOpen={showSummary}
        exerciseName={exerciseName}
        seriesConfig={seriesConfig}
        stimulusTiming={stimulusTiming}
        selectedIds={selectedIds}
        onConfirm={() => {
          setShowSummary(false);
          onStart();
        }}
        onCancel={() => setShowSummary(false)}
      />

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <TabBar
        activeTab={activeTab}
        savedCount={savedExercises.length}
        onSelect={setActiveTab}
      />

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1 — CONFIGURAR
      ══════════════════════════════════════════════════════════════════ */}
      <div
        role="tabpanel"
        id="tab-panel-config"
        aria-labelledby="tab-btn-config"
        hidden={activeTab !== "config"}
        className="flex flex-col gap-4"
      >
        {/* ── Nombre + guardar ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Save aria-hidden="true" className="h-5 w-5" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
              Guardar ejercicio
            </span>
            {currentExerciseId && (
              <span className="ml-auto rounded-full bg-primary/15 px-3 py-1 text-xs font-black text-primary">
                Editando
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label
                htmlFor={`${uid}-exercise-name`}
                className="text-sm font-bold text-muted-foreground/80"
              >
                Nombre del ejercicio
              </label>
              <input
                id={`${uid}-exercise-name`}
                type="text"
                maxLength={80}
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                disabled={isConfigDisabled}
                placeholder="Ej. Reacción rápida colores"
                className="h-13 w-full rounded-xl border border-input bg-surface-raised/60 px-4 text-base font-semibold text-foreground transition-colors placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={isConfigDisabled || isPending}
              isLoading={isPending}
              className="h-13 shrink-0 gap-2 px-6 text-base"
            >
              <Save aria-hidden="true" className="h-5 w-5" />
              {currentExerciseId ? "Actualizar" : "Guardar"}
            </Button>
          </div>

          {saveError && (
            <p
              role="alert"
              className="mt-2 text-base font-semibold text-destructive"
            >
              {saveError}
            </p>
          )}
          {saveSuccess && (
            <p
              role="status"
              className="mt-2 text-base font-semibold text-success"
            >
              ✓ Ejercicio guardado correctamente.
            </p>
          )}
        </div>

        {/* ── Series + Timing ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CardShell
            icon={Repeat2}
            iconBg="bg-primary/15 text-primary"
            title="Series de trabajo"
          >
            <div className="flex flex-wrap justify-center gap-3">
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
                onChange={(v) =>
                  onSetStimulusTimingField("displayDurationMs", v)
                }
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

        {/* ── Estímulos ─────────────────────────────────────────────────── */}
        <CardShell
          icon={Eye}
          iconBg="bg-violet-500/15 text-violet-400"
          title="Estímulos visuales"
          badge={
            selectedIds.length > 0 ? (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">
                {selectedIds.length} seleccionados
              </span>
            ) : (
              <span className="rounded-full bg-muted/30 px-3 py-1 text-sm font-bold text-muted-foreground">
                Ninguno
              </span>
            )
          }
        >
          <StimulusSelector
            selectedIds={selectedIds}
            onChange={onSelectedIdsChange}
            disabled={isConfigDisabled}
          />
        </CardShell>

        {/* ── Controles — desktop ───────────────────────────────────────── */}
        <div className="hidden flex-wrap items-center justify-center gap-4 pt-2 sm:flex">
          <ControlButtons
            status={status}
            canStartWithStimuli={canStartWithStimuli}
            onRequestStart={() => setShowSummary(true)}
            onStart={onStart}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
            onRestart={onRestart}
            buttonClassName="h-14 min-w-52 text-base font-bold"
          />
        </div>

        {!canStartWithStimuli && status === "idle" && (
          <p className="hidden text-center text-base text-muted-foreground sm:block">
            {phaseDuration(seriesConfig, "work") === 0
              ? "Define un tiempo de trabajo para iniciar."
              : "Selecciona al menos un estímulo para iniciar."}
          </p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2 — MIS EJERCICIOS
      ══════════════════════════════════════════════════════════════════ */}
      <div
        role="tabpanel"
        id="tab-panel-saved"
        aria-labelledby="tab-btn-saved"
        hidden={activeTab !== "saved"}
        className="flex flex-col gap-4"
      >
        {/* Info contextual cuando hay un ejercicio activo */}
        {currentExerciseId && activeTab === "saved" && (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.06] px-5 py-4">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
            <p className="text-base text-muted-foreground">
              Ejercicio activo:{" "}
              <strong className="text-foreground">
                {savedExercises.find((e) => e.id === currentExerciseId)?.config
                  .name ?? "—"}
              </strong>
            </p>
          </div>
        )}

        <SavedExercisesTable
          exercises={savedExercises}
          currentId={currentExerciseId}
          isPending={isPending}
          onLoad={handleLoad}
          onDelete={handleDelete}
        />
      </div>

      {/* ── Mobile sticky action bar (siempre visible) ───────────────────── */}
      <div className="sticky bottom-0 z-10 border-t border-border/50 bg-card/95 py-4 backdrop-blur-md sm:hidden">
        {canStartWithStimuli && (status === "idle" || status === "done") && (
          <div className="mb-3 flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground">
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
        {!canStartWithStimuli && status === "idle" && (
          <p className="mb-2 text-center text-sm font-semibold text-muted-foreground">
            {phaseDuration(seriesConfig, "work") === 0
              ? "Define un tiempo de trabajo para iniciar."
              : "Selecciona al menos un estímulo."}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ControlButtons
            status={status}
            canStartWithStimuli={canStartWithStimuli}
            onRequestStart={() => setShowSummary(true)}
            onStart={onStart}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
            onRestart={onRestart}
            buttonClassName="h-13 min-w-44 text-base font-bold"
          />
        </div>
      </div>
    </div>
  );
});
