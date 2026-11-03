/**
 * useCognitiveTimer
 *
 * Drives the series timer + stimulus scheduling for a cognitive exercise.
 *
 * Architecture:
 * - Extends the series-timer state machine (work/rest phases, series counter).
 * - Before the timer starts, pre-computes a full execution plan:
 *   one array of { stimulus, startOffsetMs } per work phase.
 *   This eliminates all Math.random() calls during execution and ensures
 *   the run loop is pure lookups — important for 250 ms tick accuracy.
 * - During a work phase, the stimulus scheduler checks which entry in the
 *   pre-computed plan should be active given the elapsed time.
 * - During rest phases and when paused, no stimulus is shown.
 *
 * Sound is kept minimal: reuses the existing useTimerSound hook.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTimerSound } from "@/app/dashboard/trainings/timers/_components/use-timer-sound";
import { usePrepare } from "@/app/dashboard/trainings/timers/_components/use-prepare";
import { useFullscreen } from "@/app/dashboard/trainings/timers/_components/use-fullscreen";
import {
  useSidebarCollapsed,
  useSidebarToggle,
} from "@/presentation/components/app-shell";
import { resolveStimuli } from "./stimulus-data";
import { useStimulusSound } from "./use-stimulus-sound";
import type {
  CognitiveExerciseConfig,
  ScheduledStimulus,
  Stimulus,
  WorkPhasePlan,
} from "@/domain/cognitive-training/cognitive-exercise";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "work" | "rest";
export type CognitiveStatus = "idle" | "running" | "paused" | "done";

export interface CognitiveSeriesConfig {
  totalSeries: number;
  workMinutes: number;
  workSeconds: number;
  restMinutes: number;
  restSeconds: number;
}

export interface StimulusTimingConfig {
  displayDurationMs: number;
  gapDurationMs: number;
}

export interface CognitiveRuntimeState {
  currentSeries: number; // 1-indexed
  phase: Phase;
  remaining: number; // seconds
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatTime(totalSeconds: number): { mm: string; ss: string } {
  const s = Math.max(0, totalSeconds);
  return { mm: pad(Math.floor(s / 60)), ss: pad(s % 60) };
}

function phaseDuration(config: CognitiveSeriesConfig, phase: Phase): number {
  return phase === "work"
    ? config.workMinutes * 60 + config.workSeconds
    : config.restMinutes * 60 + config.restSeconds;
}

function initialRuntime(config: CognitiveSeriesConfig): CognitiveRuntimeState {
  return {
    currentSeries: 1,
    phase: "work",
    remaining: phaseDuration(config, "work"),
  };
}

function clamp(value: number, max: number): number {
  if (Number.isNaN(value) || value < 0) return 0;
  return Math.min(value, max);
}

export { clamp, phaseDuration };

/**
 * Fisher-Yates shuffle — returns a new array, does not mutate input.
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build the pre-computed execution plan for all work phases.
 *
 * For each series:
 * 1. Shuffle the selected stimuli.
 * 2. Fill the work-phase duration with as many stimuli as fit, cycling through
 *    the shuffled pool if necessary.
 * 3. Each entry gets an absolute offset (ms) from the start of the work phase.
 *
 * @param selectedStimuli  Resolved Stimulus objects to cycle through.
 * @param config           Series config (for work phase duration).
 * @param timing           Display and gap durations (ms).
 * @returns                One WorkPhasePlan per series, or [] if no stimuli.
 */
export function buildExecutionPlan(
  selectedStimuli: Stimulus[],
  config: CognitiveSeriesConfig,
  timing: StimulusTimingConfig,
): WorkPhasePlan[] {
  if (selectedStimuli.length === 0) return [];

  const workDurationMs = (config.workMinutes * 60 + config.workSeconds) * 1000;
  const slotMs = timing.displayDurationMs + timing.gapDurationMs;

  if (slotMs <= 0 || workDurationMs <= 0) return [];

  const plans: WorkPhasePlan[] = [];

  for (let s = 0; s < config.totalSeries; s++) {
    const shuffled = shuffle(selectedStimuli);
    const scheduled: ScheduledStimulus[] = [];
    let offset = 0;
    let poolIndex = 0;

    while (offset + timing.displayDurationMs <= workDurationMs) {
      scheduled.push({
        stimulus: shuffled[poolIndex % shuffled.length],
        startOffsetMs: offset,
      });
      poolIndex++;
      offset += slotMs;
      // Reshuffle when we've exhausted the pool to avoid long repetition runs
      if (poolIndex % shuffled.length === 0) {
        shuffled.splice(0, shuffled.length, ...shuffle(selectedStimuli));
      }
    }

    plans.push({ seriesIndex: s, stimuli: scheduled });
  }

  return plans;
}

/**
 * Given the current elapsed time within a work phase and the plan for that
 * phase, returns the stimulus that should currently be visible (or null).
 *
 * Performance: binary search on the pre-sorted stimuli array (sorted by
 * startOffsetMs ascending, which buildExecutionPlan guarantees). This brings
 * the hot-path cost from O(N) to O(log N) — called 10×/second during every
 * work phase.
 */
export function getActiveStimulusForOffset(
  plan: WorkPhasePlan,
  elapsedMs: number,
  displayDurationMs: number,
): Stimulus | null {
  const stimuli = plan.stimuli;
  let lo = 0;
  let hi = stimuli.length - 1;

  // Binary search for the last entry whose startOffsetMs <= elapsedMs
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (stimuli[mid].startOffsetMs <= elapsedMs) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // hi now points to the last entry that could be active
  if (hi < 0) return null;
  const candidate = stimuli[hi];
  const endMs = candidate.startOffsetMs + displayDurationMs;
  return elapsedMs < endMs ? candidate.stimulus : null;
}

// ─── REST image paths (same pool as stimulus-overlay.tsx) ────────────────────

const REST_IMAGE_PATHS = [
  "/rest/descanso_1.jpg",
  "/rest/descanso_2.jpg",
  "/rest/descanso_3.jpg",
] as const;

/**
 * Imperatively preload a list of image URLs into the browser cache so they
 * are available before the first rest phase begins. Non-blocking: runs only
 * in the browser and ignores errors (the overlay handles missing images
 * gracefully via Next/Image).
 */
function preloadImages(paths: readonly string[]): void {
  if (typeof window === "undefined") return;
  for (const path of paths) {
    const img = new Image();
    img.src = path;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseCognitiveTimerReturn {
  // Config state
  seriesConfig: CognitiveSeriesConfig;
  stimulusTiming: StimulusTimingConfig;
  setSeriesField: <K extends keyof CognitiveSeriesConfig>(
    key: K,
    value: CognitiveSeriesConfig[K],
  ) => void;
  setStimulusTimingField: <K extends keyof StimulusTimingConfig>(
    key: K,
    value: StimulusTimingConfig[K],
  ) => void;

  // Runtime state
  runtime: CognitiveRuntimeState;
  status: CognitiveStatus;
  isPreparing: boolean;
  prepareSecondsLeft: number;

  // Active stimulus (null = no stimulus should show)
  activeStimulus: Stimulus | null;

  // Display values (pre-formatted)
  displayMm: string;
  displaySs: string;
  progressPercent: number;

  // Fullscreen
  isFullscreen: boolean;
  fsRef: React.RefObject<HTMLDivElement | null>;

  // Handlers
  handleStart: () => void;
  handlePause: () => void;
  handleResume: () => void;
  handleStop: () => void;
  handleRestart: () => void;
  handleExitFullscreen: () => void;
  loadConfig: (cfg: CognitiveExerciseConfig) => void;

  // Guard
  canStart: boolean;
  isConfigDisabled: boolean;
}

export function useCognitiveTimer(): UseCognitiveTimerReturn {
  // ── Config ─────────────────────────────────────────────────────────────────

  const [seriesConfig, setSeriesConfig] = useState<CognitiveSeriesConfig>({
    totalSeries: 3,
    workMinutes: 3,
    workSeconds: 0,
    restMinutes: 1,
    restSeconds: 0,
  });

  const [stimulusTiming, setStimulusTiming] = useState<StimulusTimingConfig>({
    displayDurationMs: 1500,
    gapDurationMs: 500,
  });

  // ── Runtime ────────────────────────────────────────────────────────────────

  const [runtime, setRuntime] = useState<CognitiveRuntimeState>(() =>
    initialRuntime({
      totalSeries: 3,
      workMinutes: 3,
      workSeconds: 0,
      restMinutes: 1,
      restSeconds: 0,
    }),
  );
  const [status, setStatus] = useState<CognitiveStatus>("idle");

  // Active stimulus shown on screen
  const [activeStimulus, setActiveStimulus] = useState<Stimulus | null>(null);

  // Progress bar percentage — updated every 3 ticks (300 ms) instead of every
  // tick. The TopProgressBar has a `transition-all duration-300` CSS animation,
  // so updating faster produces no visible improvement and wastes diff work.
  const [progressPercent, setProgressPercent] = useState(0);

  // ── Pre-computed execution plan (built on Start) ───────────────────────────
  const executionPlanRef = useRef<WorkPhasePlan[]>([]);

  // The stimulus IDs are managed by the parent (exercise-config-form).
  // We keep a local ref to them so the timer can access them when launching.
  const selectedStimulusIdsRef = useRef<string[]>([]);

  // Tracks elapsed ms within the current work phase (for stimulus scheduling)
  const workPhaseStartTimeRef = useRef<number | null>(null);

  // ── Refs for timer mechanics ────────────────────────────────────────────────
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRuntimeRef = useRef<CognitiveRuntimeState | null>(null);
  const lastBeepSecondRef = useRef<number>(-1);
  const newSeriesAlertedRef = useRef(false);
  const currentPhaseRef = useRef<Phase>("work");
  const runtimeRef = useRef<CognitiveRuntimeState>(runtime);
  const stimulusTimingRef = useRef(stimulusTiming);
  // Throttle: only update progressPercent every 3 ticks (300 ms).
  // The progress bar has a 300 ms CSS transition, so updating faster is wasted
  // work that triggers extra React state diffs with no visible benefit.
  const tickCountRef = useRef(0);

  // Sync runtimeRef so the interval always reads the latest value without
  // introducing it as a dependency.
  useEffect(() => {
    runtimeRef.current = runtime;
  });

  useEffect(() => {
    stimulusTimingRef.current = stimulusTiming;
  }, [stimulusTiming]);

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

  // ── Preparation ────────────────────────────────────────────────────────────
  const { isPreparing, prepareSecondsLeft, startPrepare, cancelPrepare } =
    usePrepare({ preload, playBeep });

  // ── Stimulus sound ─────────────────────────────────────────────────────────
  // Hook separado del timer sound para no mezclar buffers de fases con
  // buffers de estímulos. Mismo patrón: preload antes del inicio, play en O(1).
  const { preloadPaths, playPath } = useStimulusSound();
  // Ref estable para que el setInterval siempre lea la última versión
  const stimulusSoundRef = useRef({ playPath });
  useEffect(() => {
    stimulusSoundRef.current = { playPath };
  }, [playPath]);

  // ── Tick cleanup ───────────────────────────────────────────────────────────
  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTick(), [clearTick]);

  // ── Done effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "done") return;
    exitFullscreen();
    workPhaseStartTimeRef.current = null;
    if (didCollapseSidebarRef.current) {
      sidebarToggle();
      didCollapseSidebarRef.current = false;
    }
    const t = setTimeout(() => {
      setActiveStimulus(null);
      setProgressPercent(0);
      setRuntime(initialRuntime(seriesConfig));
      setStatus("idle");
    }, 600);
    return () => clearTimeout(t);
  }, [status, exitFullscreen, sidebarToggle, seriesConfig]);

  // ── Config sync when idle ──────────────────────────────────────────────────
  const [prevConfig, setPrevConfig] = useState(seriesConfig);
  if (status === "idle" && prevConfig !== seriesConfig) {
    setPrevConfig(seriesConfig);
    setRuntime(initialRuntime(seriesConfig));
  }

  // ── Stimulus update (called inside the tick interval) ────────────────────
  // lastPlayedStimulusIdRef evita reproducir el mismo sonido varias veces
  // mientras el estímulo permanece visible (el tick corre cada 100ms).
  const lastPlayedStimulusIdRef = useRef<string | null>(null);

  const updateStimulus = useCallback(
    (seriesIndex: number, phaseStartTime: number) => {
      const plan = executionPlanRef.current[seriesIndex];
      if (!plan) {
        setActiveStimulus(null);
        return;
      }
      const elapsedMs = Date.now() - phaseStartTime;
      const next = getActiveStimulusForOffset(
        plan,
        elapsedMs,
        stimulusTimingRef.current.displayDurationMs,
      );
      setActiveStimulus(next);

      // Reproducir sonido sólo cuando el estímulo cambia (no en cada tick)
      if (
        next &&
        next.kind === "sound" &&
        next.id !== lastPlayedStimulusIdRef.current
      ) {
        lastPlayedStimulusIdRef.current = next.id;
        stimulusSoundRef.current.playPath(next.soundPath);
      }
      if (!next) {
        lastPlayedStimulusIdRef.current = null;
      }
    },
    [],
  );

  // ── startTick (mirrors series-timer's startTick + adds stimulus logic) ────

  const startTick = useCallback(
    (
      fromRuntime: CognitiveRuntimeState,
      secondsLeft: number,
      cfg: CognitiveSeriesConfig,
    ) => {
      clearTick();
      endTimeRef.current = Date.now() + secondsLeft * 1000;
      lastBeepSecondRef.current = -1;
      currentPhaseRef.current = fromRuntime.phase;
      tickCountRef.current = 0;

      // Record work phase start for stimulus scheduling
      if (fromRuntime.phase === "work") {
        workPhaseStartTimeRef.current = Date.now();
      } else {
        workPhaseStartTimeRef.current = null;
        setActiveStimulus(null);
      }

      intervalRef.current = setInterval(() => {
        if (endTimeRef.current === null) return;

        // Throttle: count ticks so stimulus + remaining update every tick,
        // but the newSeries sound guard runs on every tick regardless.
        tickCountRef.current += 1;

        const left = Math.round((endTimeRef.current - Date.now()) / 1000);

        // Update stimulus during work phase (every tick — needs ms precision)
        if (
          currentPhaseRef.current === "work" &&
          workPhaseStartTimeRef.current !== null
        ) {
          const currentSeries = runtimeRef.current.currentSeries - 1; // 0-indexed
          updateStimulus(currentSeries, workPhaseStartTimeRef.current);
        }

        if (left > 0) {
          setRuntime((prev) => ({ ...prev, remaining: left }));

          // Throttle progressPercent update to every 3 ticks (300 ms).
          // The progress bar CSS transition is 300 ms, so finer updates
          // produce no visible change and just waste React diffing.
          if (tickCountRef.current % 3 === 0) {
            const phaseDur =
              currentPhaseRef.current === "work"
                ? phaseDuration(cfg, "work")
                : phaseDuration(cfg, "rest");
            if (phaseDur > 0) {
              setProgressPercent(
                Math.round(((phaseDur - left) / phaseDur) * 100),
              );
            }
          }

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

        // Phase finished
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
              setActiveStimulus(null);
              workPhaseStartTimeRef.current = null;
              return { ...prev, remaining: 0 };
            }

            const restDuration = phaseDuration(cfg, "rest");
            if (restDuration === 0) {
              // Skip rest — go straight to next work phase
              const nextWork = phaseDuration(cfg, "work");
              const nextSeries = prev.currentSeries + 1;
              endTimeRef.current = Date.now() + nextWork * 1000;
              lastBeepSecondRef.current = -1;
              currentPhaseRef.current = "work";
              workPhaseStartTimeRef.current = Date.now();
              tickCountRef.current = 0;
              soundRef.current.playWork();
              return {
                currentSeries: nextSeries,
                phase: "work",
                remaining: nextWork,
              };
            }

            endTimeRef.current = Date.now() + restDuration * 1000;
            lastBeepSecondRef.current = -1;
            newSeriesAlertedRef.current = false;
            currentPhaseRef.current = "rest";
            workPhaseStartTimeRef.current = null;
            tickCountRef.current = 0;
            setActiveStimulus(null);
            soundRef.current.playRest();
            return { ...prev, phase: "rest", remaining: restDuration };
          } else {
            // Rest finished — start next work phase
            const workDuration = phaseDuration(cfg, "work");
            const nextSeries = prev.currentSeries + 1;
            endTimeRef.current = Date.now() + workDuration * 1000;
            lastBeepSecondRef.current = -1;
            currentPhaseRef.current = "work";
            workPhaseStartTimeRef.current = Date.now();
            tickCountRef.current = 0;
            soundRef.current.playWork();
            return {
              currentSeries: nextSeries,
              phase: "work",
              remaining: workDuration,
            };
          }
        });
      }, 100); // 100 ms tick — needed for sub-second stimulus accuracy
    },
    [clearTick, updateStimulus],
  );

  // ── launchTimer ────────────────────────────────────────────────────────────

  const launchTimer = useCallback(() => {
    const workDuration = phaseDuration(seriesConfig, "work");
    if (workDuration === 0 || seriesConfig.totalSeries === 0) return;

    let fromRuntime: CognitiveRuntimeState;
    let secondsLeft: number;

    if (status === "paused" && pausedRuntimeRef.current) {
      fromRuntime = pausedRuntimeRef.current;
      secondsLeft = fromRuntime.remaining;
      pausedRuntimeRef.current = null;
    } else {
      fromRuntime = initialRuntime(seriesConfig);
      secondsLeft = phaseDuration(seriesConfig, fromRuntime.phase);
      setRuntime(fromRuntime);
    }

    setStatus("running");
    startTick(fromRuntime, secondsLeft, seriesConfig);
    soundRef.current.playWork();
  }, [seriesConfig, status, startTick]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    const workDuration = phaseDuration(seriesConfig, "work");
    if (workDuration === 0 || seriesConfig.totalSeries === 0) return;

    // Build execution plan fresh on every start.
    // All randomness (Fisher-Yates shuffle) runs here — the run loop is
    // pure O(log N) lookups with no Math.random() calls during execution.
    const stimuli = resolveStimuli(selectedStimulusIdsRef.current);
    executionPlanRef.current = buildExecutionPlan(
      stimuli,
      seriesConfig,
      stimulusTiming,
    );

    // Preload audio buffers for sound stimuli (non-blocking — fire and forget)
    const soundPaths = stimuli
      .filter((s) => s.kind === "sound")
      .map((s) => (s as { soundPath: string }).soundPath);
    if (soundPaths.length > 0) {
      preloadPaths(soundPaths).catch(() => {});
    }

    // Preload REST background images so they are in the browser cache before
    // the first rest phase begins. Runs only when there is at least one rest
    // phase (restDuration > 0) to avoid unnecessary requests.
    if (phaseDuration(seriesConfig, "rest") > 0) {
      preloadImages(REST_IMAGE_PATHS);
    }

    if (!isFullscreen) enterFullscreen();
    if (!sidebarCollapsed) {
      sidebarToggle();
      didCollapseSidebarRef.current = true;
    }
    startPrepare(launchTimer);
  }, [
    seriesConfig,
    stimulusTiming,
    isFullscreen,
    enterFullscreen,
    sidebarCollapsed,
    sidebarToggle,
    startPrepare,
    launchTimer,
    preloadPaths,
  ]);

  const handlePause = useCallback(() => {
    clearTick();
    endTimeRef.current = null;
    pausedRuntimeRef.current = runtimeRef.current;
    setActiveStimulus(null);
    workPhaseStartTimeRef.current = null;
    setStatus("paused");
  }, [clearTick]);

  const handleStop = useCallback(() => {
    cancelPrepare();
    clearTick();
    endTimeRef.current = null;
    pausedRuntimeRef.current = null;
    workPhaseStartTimeRef.current = null;
    setActiveStimulus(null);
    setProgressPercent(0);
    setRuntime(initialRuntime(seriesConfig));
    setStatus("idle");
    if (isFullscreen) exitFullscreen();
    if (didCollapseSidebarRef.current) {
      sidebarToggle();
      didCollapseSidebarRef.current = false;
    }
  }, [
    cancelPrepare,
    clearTick,
    seriesConfig,
    isFullscreen,
    exitFullscreen,
    sidebarToggle,
  ]);

  const handleRestart = useCallback(() => {
    cancelPrepare();
    clearTick();
    // Rebuild execution plan on restart — all randomness pre-computed here
    const stimuli = resolveStimuli(selectedStimulusIdsRef.current);
    executionPlanRef.current = buildExecutionPlan(
      stimuli,
      seriesConfig,
      stimulusTiming,
    );
    // Re-preload sound paths in case the AudioContext was closed
    const soundPaths = stimuli
      .filter((s) => s.kind === "sound")
      .map((s) => (s as { soundPath: string }).soundPath);
    if (soundPaths.length > 0) {
      preloadPaths(soundPaths).catch(() => {});
    }
    // Re-preload REST images (cache hit if already loaded, no extra request)
    if (phaseDuration(seriesConfig, "rest") > 0) {
      preloadImages(REST_IMAGE_PATHS);
    }
    const fresh = initialRuntime(seriesConfig);
    const secondsLeft = phaseDuration(seriesConfig, fresh.phase);
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    setRuntime(fresh);
    setStatus("running");
    startTick(fresh, secondsLeft, seriesConfig);
  }, [
    cancelPrepare,
    clearTick,
    seriesConfig,
    stimulusTiming,
    startTick,
    preloadPaths,
  ]);

  const handleResume = useCallback(() => {
    if (!pausedRuntimeRef.current) return;
    const fromRuntime = pausedRuntimeRef.current;
    const secondsLeft = fromRuntime.remaining;
    pausedRuntimeRef.current = null;
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    setStatus("running");
    startTick(fromRuntime, secondsLeft, seriesConfig);
  }, [seriesConfig, startTick]);

  const handleExitFullscreen = useCallback(() => {
    if (isPreparing) {
      cancelPrepare();
    } else if (status === "running") {
      clearTick();
      endTimeRef.current = null;
      pausedRuntimeRef.current = runtimeRef.current;
      workPhaseStartTimeRef.current = null;
      setActiveStimulus(null);
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

  // ── Config setters ─────────────────────────────────────────────────────────

  const setSeriesField = useCallback(
    <K extends keyof CognitiveSeriesConfig>(
      key: K,
      value: CognitiveSeriesConfig[K],
    ) => {
      setSeriesConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setStimulusTimingField = useCallback(
    <K extends keyof StimulusTimingConfig>(
      key: K,
      value: StimulusTimingConfig[K],
    ) => {
      setStimulusTiming((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /**
   * Load a saved exercise config into the hook.
   * Exposed so the parent form can populate state when the user selects a saved exercise.
   */
  const loadConfig = useCallback((cfg: CognitiveExerciseConfig) => {
    setSeriesConfig(cfg.seriesConfig);
    setStimulusTiming(cfg.stimulusTiming);
    selectedStimulusIdsRef.current = cfg.selectedStimulusIds;
    // Reset runtime to match new config
    setRuntime(initialRuntime(cfg.seriesConfig));
    setStatus("idle");
    setActiveStimulus(null);
  }, []);

  // ── Expose selectedStimulusIds setter so parent can sync ─────────────────
  // We return a callback instead of the ref to keep the API clean.
  const setSelectedStimulusIds = useCallback((ids: string[]) => {
    selectedStimulusIdsRef.current = ids;
  }, []);

  // ── Derived display values ─────────────────────────────────────────────────

  const idleWorkTime = useMemo(
    () => formatTime(phaseDuration(seriesConfig, "work")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seriesConfig.workMinutes, seriesConfig.workSeconds],
  );

  const { mm, ss } = formatTime(runtime.remaining);
  const displayMm = status === "idle" ? idleWorkTime.mm : mm;
  const displaySs = status === "idle" ? idleWorkTime.ss : ss;

  // progressPercent is managed as state updated inside the tick (every 3 ticks)
  // to avoid recomputing it on every render and avoid prop-drilling a derived
  // value that changes 10×/s. During idle it is always 0.

  const isConfigDisabled =
    isPreparing || status === "running" || status === "paused";
  const canStart =
    phaseDuration(seriesConfig, "work") > 0 && seriesConfig.totalSeries > 0;

  return {
    seriesConfig,
    stimulusTiming,
    setSeriesField,
    setStimulusTimingField,
    runtime,
    status,
    isPreparing,
    prepareSecondsLeft,
    activeStimulus,
    displayMm,
    displaySs,
    progressPercent,
    isFullscreen,
    fsRef,
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    handleRestart,
    handleExitFullscreen,
    loadConfig,
    canStart,
    isConfigDisabled,
    // Extra internal setter exposed for the parent form
    _setSelectedStimulusIds: setSelectedStimulusIds,
  } as UseCognitiveTimerReturn & {
    _setSelectedStimulusIds: (ids: string[]) => void;
  };
}
