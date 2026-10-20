/**
 * Static catalogue of all available stimuli.
 *
 * This is the single source of truth for what stimuli exist.
 * It is imported by the selector UI and by the execution engine.
 *
 * Design notes:
 * - Colors use the CSS custom property palette for consistency; the actual
 *   hex values are standalone so they work inside SVGs.
 * - Letter and number stimuli store the glyph as uppercase for display.
 * - IDs are stable string constants — safe to persist in the database.
 */

import type {
  ArrowStimulus,
  ColorStimulus,
  LetterStimulus,
  NumberStimulus,
  SoundStimulus,
  Stimulus,
  StimulusCategory,
} from "@/domain/cognitive-training/cognitive-exercise";

// ─── Colours ──────────────────────────────────────────────────────────────────

export const COLOR_STIMULI: ColorStimulus[] = [
  { kind: "color", id: "color-blue", label: "Azul", hex: "#3B82F6" },
  { kind: "color", id: "color-red", label: "Rojo", hex: "#EF4444" },
  { kind: "color", id: "color-yellow", label: "Amarillo", hex: "#EAB308" },
  { kind: "color", id: "color-purple", label: "Morado", hex: "#A855F7" },
  { kind: "color", id: "color-green", label: "Verde", hex: "#22C55E" },
];

// ─── Vowels ───────────────────────────────────────────────────────────────────

export const LETTER_STIMULI: LetterStimulus[] = [
  { kind: "letter", id: "letter-a", label: "A", glyph: "A" },
  { kind: "letter", id: "letter-e", label: "E", glyph: "E" },
  { kind: "letter", id: "letter-i", label: "I", glyph: "I" },
  { kind: "letter", id: "letter-o", label: "O", glyph: "O" },
  { kind: "letter", id: "letter-u", label: "U", glyph: "U" },
];

// ─── Digits ───────────────────────────────────────────────────────────────────

export const NUMBER_STIMULI: NumberStimulus[] = [
  { kind: "number", id: "number-0", label: "0", glyph: "0" },
  { kind: "number", id: "number-1", label: "1", glyph: "1" },
  { kind: "number", id: "number-2", label: "2", glyph: "2" },
  { kind: "number", id: "number-3", label: "3", glyph: "3" },
  { kind: "number", id: "number-4", label: "4", glyph: "4" },
  { kind: "number", id: "number-5", label: "5", glyph: "5" },
  { kind: "number", id: "number-6", label: "6", glyph: "6" },
  { kind: "number", id: "number-7", label: "7", glyph: "7" },
  { kind: "number", id: "number-8", label: "8", glyph: "8" },
  { kind: "number", id: "number-9", label: "9", glyph: "9" },
];

// ─── Arrows ───────────────────────────────────────────────────────────────────

export const ARROW_STIMULI: ArrowStimulus[] = [
  { kind: "arrow", id: "arrow-up", label: "Arriba", direction: "up" },
  { kind: "arrow", id: "arrow-down", label: "Abajo", direction: "down" },
  { kind: "arrow", id: "arrow-left", label: "Izquierda", direction: "left" },
  { kind: "arrow", id: "arrow-right", label: "Derecha", direction: "right" },
  {
    kind: "arrow",
    id: "arrow-up-right",
    label: "Arr-Der",
    direction: "up-right",
  },
  {
    kind: "arrow",
    id: "arrow-up-left",
    label: "Arr-Izq",
    direction: "up-left",
  },
  {
    kind: "arrow",
    id: "arrow-down-right",
    label: "Abj-Der",
    direction: "down-right",
  },
  {
    kind: "arrow",
    id: "arrow-down-left",
    label: "Abj-Izq",
    direction: "down-left",
  },
];

// ─── Sounds ───────────────────────────────────────────────────────────────────
//
// Each entry maps to a file in /public/sounds/estimulos/.
// The soundPath is stored in the domain model so the execution engine can
// preload the AudioBuffer at start time and look it up at O(1) during the run.

export const SOUND_STIMULI: SoundStimulus[] = [
  // Colors
  {
    kind: "sound",
    id: "sound-azul",
    label: "Azul",
    soundPath: "/sounds/estimulos/azul.mp3",
  },
  {
    kind: "sound",
    id: "sound-rojo",
    label: "Rojo",
    soundPath: "/sounds/estimulos/rojo.mp3",
  },
  {
    kind: "sound",
    id: "sound-amarillo",
    label: "Amarillo",
    soundPath: "/sounds/estimulos/amarillo.mp3",
  },
  {
    kind: "sound",
    id: "sound-morado",
    label: "Morado",
    soundPath: "/sounds/estimulos/morado.mp3",
  },
  // Vowels
  {
    kind: "sound",
    id: "sound-a",
    label: "A",
    soundPath: "/sounds/estimulos/sonido_a.mp3",
  },
  {
    kind: "sound",
    id: "sound-e",
    label: "E",
    soundPath: "/sounds/estimulos/sonido_e.mp3",
  },
  {
    kind: "sound",
    id: "sound-i",
    label: "I",
    soundPath: "/sounds/estimulos/sonido_i.mp3",
  },
  {
    kind: "sound",
    id: "sound-o",
    label: "O",
    soundPath: "/sounds/estimulos/sonido_o.mp3",
  },
  {
    kind: "sound",
    id: "sound-u",
    label: "U",
    soundPath: "/sounds/estimulos/sonido_u.mp3",
  },
  // Digits
  {
    kind: "sound",
    id: "sound-0",
    label: "0",
    soundPath: "/sounds/estimulos/sonido_0.mp3",
  },
  {
    kind: "sound",
    id: "sound-1",
    label: "1",
    soundPath: "/sounds/estimulos/sonido_1.mp3",
  },
  {
    kind: "sound",
    id: "sound-2",
    label: "2",
    soundPath: "/sounds/estimulos/sonido_2.mp3",
  },
  {
    kind: "sound",
    id: "sound-3",
    label: "3",
    soundPath: "/sounds/estimulos/sonido_3.mp3",
  },
  {
    kind: "sound",
    id: "sound-4",
    label: "4",
    soundPath: "/sounds/estimulos/sonido_4.mp3",
  },
  {
    kind: "sound",
    id: "sound-5",
    label: "5",
    soundPath: "/sounds/estimulos/sonido_5.mp3",
  },
  {
    kind: "sound",
    id: "sound-6",
    label: "6",
    soundPath: "/sounds/estimulos/sonido_6.mp3",
  },
  {
    kind: "sound",
    id: "sound-7",
    label: "7",
    soundPath: "/sounds/estimulos/sonido_7.mp3",
  },
  {
    kind: "sound",
    id: "sound-8",
    label: "8",
    soundPath: "/sounds/estimulos/sonido_8.mp3",
  },
  {
    kind: "sound",
    id: "sound-9",
    label: "9",
    soundPath: "/sounds/estimulos/sonido_9.mp3",
  },
  // Cardinal directions
  {
    kind: "sound",
    id: "sound-arriba",
    label: "Arriba",
    soundPath: "/sounds/estimulos/sonido_arriba.mp3",
  },
  {
    kind: "sound",
    id: "sound-abajo",
    label: "Abajo",
    soundPath: "/sounds/estimulos/sonido_abajo.mp3",
  },
  {
    kind: "sound",
    id: "sound-izquierda",
    label: "Izquierda",
    soundPath: "/sounds/estimulos/sonido_izquierda.mp3",
  },
  {
    kind: "sound",
    id: "sound-derecha",
    label: "Derecha",
    soundPath: "/sounds/estimulos/sonido_derecha.mp3",
  },
  {
    kind: "sound",
    id: "sound-centro",
    label: "Centro",
    soundPath: "/sounds/estimulos/sonido_centro.mp3",
  },
  // Diagonal directions
  {
    kind: "sound",
    id: "sound-diag-arr-der",
    label: "Arr-Der",
    soundPath: "/sounds/estimulos/sonido_diagonal__arriba_derecha.mp3",
  },
  {
    kind: "sound",
    id: "sound-diag-arr-izq",
    label: "Arr-Izq",
    soundPath: "/sounds/estimulos/sonido_diagonal_arriba_izquierda.mp3",
  },
  {
    kind: "sound",
    id: "sound-diag-abj-der",
    label: "Abj-Der",
    soundPath: "/sounds/estimulos/sonido_diagonal_abajo_derecha.mp3",
  },
  {
    kind: "sound",
    id: "sound-diag-abj-izq",
    label: "Abj-Izq",
    soundPath: "/sounds/estimulos/sonido_diagonal_abajo_izquierda.mp3",
  },
  // Rotations
  {
    kind: "sound",
    id: "sound-giro-der",
    label: "Giro Der",
    soundPath: "/sounds/estimulos/sonido_giro_derecha.mp3",
  },
  {
    kind: "sound",
    id: "sound-giro-izq",
    label: "Giro Izq",
    soundPath: "/sounds/estimulos/sonido_giro_izquierda.mp3",
  },
];

// ─── Unified catalogue ────────────────────────────────────────────────────────

export const ALL_STIMULI: Stimulus[] = [
  ...COLOR_STIMULI,
  ...LETTER_STIMULI,
  ...NUMBER_STIMULI,
  ...ARROW_STIMULI,
  ...SOUND_STIMULI,
];

/** Fast O(1) lookup by id. */
const STIMULUS_BY_ID: ReadonlyMap<string, Stimulus> = new Map(
  ALL_STIMULI.map((s) => [s.id, s]),
);

export function getStimulusById(id: string): Stimulus | undefined {
  return STIMULUS_BY_ID.get(id);
}

/** Resolve a list of IDs back into Stimulus objects (missing IDs are dropped). */
export function resolveStimuli(ids: string[]): Stimulus[] {
  return ids.flatMap((id) => {
    const s = STIMULUS_BY_ID.get(id);
    return s ? [s] : [];
  });
}

// ─── Category metadata ────────────────────────────────────────────────────────

export interface CategoryMeta {
  id: StimulusCategory;
  label: string;
  accentColor: string; // Tailwind arbitrary color for the category badge
  accentBg: string; // Tailwind bg class
  accentBorder: string; // Tailwind border class
  stimuli: Stimulus[];
}

export const STIMULUS_CATEGORIES: CategoryMeta[] = [
  {
    id: "color",
    label: "Colores",
    accentColor: "text-violet-400",
    accentBg: "bg-violet-500/15",
    accentBorder: "border-violet-500/30",
    stimuli: COLOR_STIMULI,
  },
  {
    id: "letter",
    label: "Letras",
    accentColor: "text-sky-400",
    accentBg: "bg-sky-500/15",
    accentBorder: "border-sky-500/30",
    stimuli: LETTER_STIMULI,
  },
  {
    id: "number",
    label: "Números",
    accentColor: "text-emerald-400",
    accentBg: "bg-emerald-500/15",
    accentBorder: "border-emerald-500/30",
    stimuli: NUMBER_STIMULI,
  },
  {
    id: "arrow",
    label: "Flechas",
    accentColor: "text-orange-400",
    accentBg: "bg-orange-500/15",
    accentBorder: "border-orange-500/30",
    stimuli: ARROW_STIMULI,
  },
  {
    id: "sound",
    label: "Auditivos",
    accentColor: "text-pink-400",
    accentBg: "bg-pink-500/15",
    accentBorder: "border-pink-500/30",
    stimuli: SOUND_STIMULI,
  },
];
