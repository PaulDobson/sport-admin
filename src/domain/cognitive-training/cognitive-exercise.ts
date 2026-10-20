/**
 * Domain: Cognitive Training
 *
 * Core types for cognitive exercises.
 * A CognitiveExercise is a configuration an instructor creates and can save,
 * combining a series-timer config with a set of visual stimuli that appear
 * randomly during work phases.
 *
 * The stimulus model is intentionally extensible — the `kind` discriminator
 * allows future types (image, sound, etc.) without breaking existing configs.
 */

// ─── Stimulus definitions ─────────────────────────────────────────────────────

/** A colour stimulus rendered as a solid fill. */
export interface ColorStimulus {
  kind: "color";
  id: string; // e.g. "color-blue"
  label: string; // e.g. "Azul"
  hex: string; // e.g. "#3B82F6"
}

/** A letter stimulus rendered as an SVG glyph. */
export interface LetterStimulus {
  kind: "letter";
  id: string; // e.g. "letter-a"
  label: string; // e.g. "A"
  glyph: string; // single character, uppercase for display
}

/** A numeric stimulus rendered as an SVG glyph. */
export interface NumberStimulus {
  kind: "number";
  id: string; // e.g. "number-0"
  label: string; // e.g. "0"
  glyph: string; // single character
}

/** A directional arrow stimulus rendered as an SVG shape. */
export interface ArrowStimulus {
  kind: "arrow";
  id: string; // e.g. "arrow-up"
  label: string; // e.g. "Arriba"
  direction:
    | "up"
    | "down"
    | "left"
    | "right"
    | "up-right"
    | "up-left"
    | "down-right"
    | "down-left";
}

/**
 * An audio stimulus — displays a musical note SVG and plays a sound file.
 * The `soundPath` is a public URL relative to the app root (e.g. "/sounds/estimulos/azul.mp3").
 * Stored in the domain so it can be persisted and looked up at execution time.
 */
export interface SoundStimulus {
  kind: "sound";
  id: string; // e.g. "sound-azul"
  label: string; // e.g. "Azul"
  soundPath: string; // public path, e.g. "/sounds/estimulos/azul.mp3"
}

/**
 * Union of all supported stimulus types.
 * Future types (image, audio, etc.) can be added here without breaking
 * existing saved configs because the discriminant is stored as `kind`.
 */
export type Stimulus =
  | ColorStimulus
  | LetterStimulus
  | NumberStimulus
  | ArrowStimulus
  | SoundStimulus;

/** Category grouping used in the selector UI. */
export type StimulusCategory = Stimulus["kind"];

// ─── Stimulus timing config ───────────────────────────────────────────────────

/**
 * How long each stimulus is shown on screen and the gap between stimuli.
 * Both values are in milliseconds for sub-second precision.
 */
export interface StimulusTimingConfig {
  /** How long a single stimulus is visible on screen (ms). */
  displayDurationMs: number;
  /** Gap between the end of one stimulus and the start of the next (ms). */
  gapDurationMs: number;
}

// ─── Exercise config (the full persistent configuration) ─────────────────────

/**
 * The full configuration an instructor saves.
 * `seriesConfig` mirrors `SeriesConfig` from the timers section.
 */
export interface CognitiveExerciseConfig {
  /** Human-readable name for the saved exercise. */
  name: string;

  /** Series work/rest setup — mirrors SeriesConfig from timers. */
  seriesConfig: {
    totalSeries: number;
    workMinutes: number;
    workSeconds: number;
    restMinutes: number;
    restSeconds: number;
  };

  /** Stimulus display timing. */
  stimulusTiming: StimulusTimingConfig;

  /**
   * The IDs of stimuli selected by the instructor.
   * During execution, these are shuffled into a pre-computed sequence.
   */
  selectedStimulusIds: string[];
}

// ─── Saved exercise (with DB identity) ───────────────────────────────────────

export interface CognitiveExercise {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  config: CognitiveExerciseConfig;
}

// ─── Execution model (pre-computed before run) ───────────────────────────────

/**
 * A single entry in the pre-computed execution plan.
 * Built before the timer starts so the run loop is pure lookup — no
 * Math.random() calls during execution.
 */
export interface ScheduledStimulus {
  stimulus: Stimulus;
  /** Absolute offset (ms) from work-phase start when this stimulus should appear. */
  startOffsetMs: number;
}

/**
 * The full pre-computed execution plan for one work phase.
 * One plan is built per work phase when the timer starts.
 */
export interface WorkPhasePlan {
  seriesIndex: number; // 0-indexed
  stimuli: ScheduledStimulus[];
}
