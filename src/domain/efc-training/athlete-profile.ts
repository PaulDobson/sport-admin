/**
 * Domain: EFC Training
 *
 * Entity types for athlete-specific EFC records:
 *   - EfcAthleteProfile   — stored physiological baseline for a given athlete
 *   - EfcAthleteTest      — periodic physical fitness test results
 *   - EfcOneRmRecord      — a saved one-repetition-maximum lift record
 *   - EfcWeightControl    — a daily weight entry for pre-competition tracking
 *
 * Also exports the WT 2024 official weight-category catalogue and the
 * supported exercise list for the 1RM calculator.
 *
 * All date fields are ISO 8601 strings (YYYY-MM-DD or full ISO timestamp).
 */

import type { EfcPeriod } from './shared';

// ─── Athlete profile ──────────────────────────────────────────────────────────

/**
 * Physiological baseline for a single athlete within a tenant.
 * One profile per athlete (upserted on `athlete_id`).
 */
export interface EfcAthleteProfile {
  id: string;
  athleteId: string;
  tenantId: string;
  /** Resting heart rate in bpm (20–220). Null if not measured. */
  fcRest: number | null;
  isSmoker: boolean;
  /** Current EFC periodisation phase assigned to this athlete. */
  efcPeriod: EfcPeriod;
  createdAt: string;
  updatedAt: string;
}

// ─── Physical fitness test ────────────────────────────────────────────────────

/**
 * A single physical fitness test session for an athlete.
 * All measurement fields are nullable — only the fields actually evaluated
 * need to be recorded.
 */
export interface EfcAthleteTest {
  id: string;
  athleteId: string;
  tenantId: string;
  /** ISO date string — the date the tests were performed. */
  evaluationDate: string;
  /** Abdominal crunches in 1 min (0–300 reps). */
  abs1min: number | null;
  /** Sit-and-reach measurement in cm (−30 to 50). */
  seatAndReachCm: number | null;
  /** Pull-ups count (0–100). */
  pullUps: number | null;
  /** Push-ups in 1 min (0–300). */
  pushUps1min: number | null;
  /** Sprint 10×5 m time in seconds (0.1–120.0). */
  sprint10x5Sec: number | null;
  /** Waist circumference in cm (40–200). */
  waistCm: number | null;
  /** Cooper test distance in metres (100–10 000). */
  enduranceMeters: number | null;
  createdAt: string;
}

// ─── 1RM record ───────────────────────────────────────────────────────────────

/**
 * A saved one-repetition-maximum record.
 * The three 1RM estimates (Epley, Brzycki, average) are stored at save time
 * so the history table is self-contained even if formula constants change later.
 */
export interface EfcOneRmRecord {
  id: string;
  athleteId: string;
  tenantId: string;
  /** Free-text or catalogue exercise name (max 150 chars). */
  exercise: string;
  /** ISO date string — evaluation date. */
  evaluationDate: string;
  /** Lifted weight in kg (0.5–500.0). */
  weightKg: number;
  /** Number of repetitions actually performed (1–30). */
  repsPerformed: number;
  /** Reps-in-reserve at time of recording (0–5). */
  rir: number;
  /** Epley 1RM estimate in kg (0.5–1 000.0). */
  oneRmEpley: number;
  /** Brzycki 1RM estimate in kg (0.5–1 000.0). */
  oneRmBrzycki: number;
  /** Simple average of Epley and Brzycki (0.5–1 000.0). */
  oneRmAverage: number;
  createdAt: string;
}

// ─── Weight control ───────────────────────────────────────────────────────────

/**
 * A single daily weight entry for pre-competition weight-cut tracking.
 * `categoryName` and `categoryLimitKg` snapshot the WT category at record time
 * so the history is accurate even if the athlete changes category later.
 */
export interface EfcWeightControl {
  id: string;
  athleteId: string;
  tenantId: string;
  /** ISO date string — the day the weight was recorded. */
  recordDate: string;
  /** Body weight in kg (30.0–200.0). */
  weightKg: number;
  /** World Taekwondo weight category name (max 50 chars), e.g. "M -74kg". */
  categoryName: string;
  /** Upper weight limit for the selected category in kg (20.0–150.0). */
  categoryLimitKg: number;
  createdAt: string;
}

// ─── World Taekwondo weight categories (WT 2024) ──────────────────────────────

/**
 * Official WT 2024 weight categories for men and women.
 * Used to populate the category selector in the Weight Cut Tracker.
 */
export const WT_WEIGHT_CATEGORIES = {
  male: [
    { name: 'M -54kg', limit: 54 },
    { name: 'M -58kg', limit: 58 },
    { name: 'M -63kg', limit: 63 },
    { name: 'M -68kg', limit: 68 },
    { name: 'M -74kg', limit: 74 },
    { name: 'M -80kg', limit: 80 },
    { name: 'M -87kg', limit: 87 },
    { name: 'M +87kg', limit: 150 },
  ],
  female: [
    { name: 'F -46kg', limit: 46 },
    { name: 'F -49kg', limit: 49 },
    { name: 'F -53kg', limit: 53 },
    { name: 'F -57kg', limit: 57 },
    { name: 'F -62kg', limit: 62 },
    { name: 'F -67kg', limit: 67 },
    { name: 'F -73kg', limit: 73 },
    { name: 'F +73kg', limit: 150 },
  ],
} as const;

// ─── 1RM exercise catalogue ───────────────────────────────────────────────────

/**
 * Supported exercises for the 1RM calculator.
 * `value` is stored in the DB; `label` is used for display.
 */
export const ONE_RM_EXERCISES = [
  { value: 'squat',       label: 'Sentadilla' },
  { value: 'bench_press', label: 'Press Banca' },
  { value: 'deadlift',    label: 'Peso Muerto' },
  { value: 'other',       label: 'Libre / Otro' },
] as const;

/** Union of valid exercise values. */
export type OneRmExercise = typeof ONE_RM_EXERCISES[number]['value'];
