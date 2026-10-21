/**
 * CognitivePanel
 *
 * The root client component for the cognitive exercises section.
 * Orchestrates:
 * - The cognitive timer hook (series state machine + stimulus scheduling)
 * - The StimulusOverlay (fullscreen projection portal)
 * - The ExerciseConfigForm (all configuration UI + save/load)
 *
 * State that must span both the form and the timer hook:
 * - selectedStimulusIds — passed down to form for display, pushed into hook
 *   via _setSelectedStimulusIds when changed
 * - savedExercises — loaded on mount via listExercisesAction, mutated locally
 *   when save/delete actions complete (optimistic updates)
 * - currentExerciseId — tracks which saved exercise is active
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useCognitiveTimer } from "./use-cognitive-timer";
import { StimulusOverlay } from "./stimulus-overlay";
import { ExerciseConfigForm } from "./exercise-config-form";
import { listExercisesAction } from "../actions";
import type { CognitiveExercise } from "@/domain/cognitive-training/cognitive-exercise";

// ─── Component ────────────────────────────────────────────────────────────────

export function CognitivePanel() {
  // ── Timer hook (owns all timer + stimulus state) ───────────────────────────
  const timer = useCognitiveTimer() as ReturnType<typeof useCognitiveTimer> & {
    _setSelectedStimulusIds: (ids: string[]) => void;
  };

  // ── Stimulus selection (mirrored between form and hook) ────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectedIdsChange = useCallback(
    (ids: string[]) => {
      setSelectedIds(ids);
      timer._setSelectedStimulusIds(ids);
    },
    [timer],
  );

  // ── Saved exercises ────────────────────────────────────────────────────────
  const [savedExercises, setSavedExercises] = useState<CognitiveExercise[]>([]);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);

  // Load saved exercises on mount
  useEffect(() => {
    listExercisesAction().then((result) => {
      if (!result.error) {
        setSavedExercises(result.exercises);
      }
    });
  }, []);

  // ── Load a saved exercise ──────────────────────────────────────────────────
  const handleLoadExercise = useCallback(
    (exercise: CognitiveExercise) => {
      timer.loadConfig(exercise.config);
      setSelectedIds(exercise.config.selectedStimulusIds);
      timer._setSelectedStimulusIds(exercise.config.selectedStimulusIds);
    },
    [timer],
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

      {/* Configuration form */}
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
