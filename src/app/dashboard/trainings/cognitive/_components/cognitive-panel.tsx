/**
 * CognitivePanel
 *
 * Root client component for the cognitive exercises section.
 * Orchestrates:
 * - useCognitiveTimer hook (series state machine + stimulus scheduling)
 * - StimulusOverlay (fullscreen projection portal)
 * - ExerciseConfigForm (all configuration UI + save/load)
 *
 * Performance notes:
 * - `initialExercises` is loaded by the parent RSC (page.tsx) and passed as a
 *   prop, eliminating the client-side mount → server-action → setState waterfall
 *   that caused an empty-list flash in the "Mis ejercicios" tab.
 * - `handleSelectedIdsChange` and `handleLoadExercise` depend on the *stable*
 *   individual callbacks extracted from the timer hook, NOT on the hook's
 *   return object. The hook return is a new object reference every render
 *   (because useCognitiveTimer calls formatTime inline, etc.), so depending
 *   on `timer` directly would recreate both handlers every 100 ms tick and
 *   propagate unnecessary re-renders to ExerciseConfigForm.
 * - ExerciseConfigForm is wrapped in React.memo (see its own file). All
 *   callback props passed to it must be stable references.
 */

"use client";

import { useState, useCallback } from "react";
import { useCognitiveTimer } from "./use-cognitive-timer";
import { StimulusOverlay } from "./stimulus-overlay";
import { ExerciseConfigForm } from "./exercise-config-form";
import type { CognitiveExercise } from "@/domain/cognitive-training/cognitive-exercise";

// ─── Component ────────────────────────────────────────────────────────────────

interface CognitivePanelProps {
  /** Pre-fetched by the parent RSC — avoids the client-side fetch waterfall. */
  initialExercises: CognitiveExercise[];
}

export function CognitivePanel({ initialExercises }: CognitivePanelProps) {
  // ── Timer hook (owns all timer + stimulus state) ───────────────────────────
  const timer = useCognitiveTimer() as ReturnType<typeof useCognitiveTimer> & {
    _setSelectedStimulusIds: (ids: string[]) => void;
  };

  // Destructure the stable callbacks before using them as useCallback deps.
  // `loadConfig` and `_setSelectedStimulusIds` are stable (useCallback with
  // empty deps inside the hook), so this is safe and avoids depending on the
  // whole `timer` object — which would create a new reference every 100 ms.
  const { loadConfig, _setSelectedStimulusIds: setTimerStimulusIds } = timer;

  // ── Stimulus selection (mirrored between form and hook) ────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectedIdsChange = useCallback(
    (ids: string[]) => {
      setSelectedIds(ids);
      setTimerStimulusIds(ids);
    },
    [setTimerStimulusIds],
  );

  // ── Saved exercises — initialized from RSC prop, mutated optimistically ────
  const [savedExercises, setSavedExercises] =
    useState<CognitiveExercise[]>(initialExercises);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(
    null,
  );

  // ── Load a saved exercise ──────────────────────────────────────────────────
  const handleLoadExercise = useCallback(
    (exercise: CognitiveExercise) => {
      loadConfig(exercise.config);
      setSelectedIds(exercise.config.selectedStimulusIds);
      setTimerStimulusIds(exercise.config.selectedStimulusIds);
    },
    [loadConfig, setTimerStimulusIds],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Fullscreen stimulus overlay (portal — renders over everything) */}
      <StimulusOverlay
        containerRef={timer.fsRef}
        isFullscreen={timer.isFullscreen}
        mm={timer.displayMm}
        ss={timer.displaySs}
        status={timer.status}
        runtime={timer.runtime}
        totalSeries={timer.seriesConfig.totalSeries}
        progressPercent={timer.progressPercent}
        isPreparing={timer.isPreparing}
        prepareSecondsLeft={timer.prepareSecondsLeft}
        activeStimulus={timer.activeStimulus}
        onPause={timer.handlePause}
        onResume={timer.handleResume}
        onStop={timer.handleStop}
        onRestart={timer.handleRestart}
        onExitFullscreen={timer.handleExitFullscreen}
      />

      {/* Configuration form — memoized; only re-renders when its props change */}
      <ExerciseConfigForm
        seriesConfig={timer.seriesConfig}
        stimulusTiming={timer.stimulusTiming}
        status={timer.status}
        isConfigDisabled={timer.isConfigDisabled}
        canStart={timer.canStart}
        selectedIds={selectedIds}
        savedExercises={savedExercises}
        currentExerciseId={currentExerciseId}
        onSetSeriesField={timer.setSeriesField}
        onSetStimulusTimingField={timer.setStimulusTimingField}
        onSelectedIdsChange={handleSelectedIdsChange}
        onLoadExercise={handleLoadExercise}
        onSetCurrentExerciseId={setCurrentExerciseId}
        onSetSavedExercises={setSavedExercises}
        onStart={timer.handleStart}
        onPause={timer.handlePause}
        onResume={timer.handleResume}
        onStop={timer.handleStop}
        onRestart={timer.handleRestart}
      />
    </>
  );
}
