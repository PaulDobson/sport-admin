/**
 * Domain: EFC Training
 *
 * Pure formula functions for 1RM estimation and weight control tracking.
 *
 *   F-16  — One-repetition maximum (Epley & Brzycki formulas)
 *   F-16b — 1RM percentage lookup table (50 %–100 % in 5 % steps)
 *   F-16c — Work-weight percentage of 1RM
 *   F-17  — EFC period–based loading prescriptions
 *   F-18  — Pre-competition weight cut metrics
 *
 * All functions are pure (no side effects, no I/O).
 * Throws `RangeError` for inputs that violate stated domain constraints.
 */

import type { EfcPeriod } from "./shared";
import type {
  OneRmResult,
  OneRmPercentageRow,
  OneRmEfcRecommendation,
} from "./computed-metrics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Round `value` to the nearest 0.5.
 *
 * Examples:
 *   72.3 → 72.5
 *   72.1 → 72.0
 *   73.0 → 73.0
 */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

// ─── F-16: 1RM calculation ────────────────────────────────────────────────────

/**
 * Convert an RPE value to estimated Reps In Reserve (RIR).
 *
 * Formula: RIR = round(10 − RPE)
 *
 * @param rpe - Rate of Perceived Exertion on a 0–10 scale.
 * @returns Non-negative integer representing estimated remaining reps.
 * @throws {RangeError} When rpe is outside [0, 10].
 *
 * **Formula reference: F-16**
 */
export function rpeToRir(rpe: number): number {
  if (rpe < 0 || rpe > 10) {
    throw new RangeError(`rpe must be between 0 and 10, received ${rpe}`);
  }
  return Math.round(10 - rpe);
}

/**
 * Estimate the one-repetition maximum (1RM) from a submaximal lift.
 *
 * Formulas:
 *   repsTotal     = repsPerformed + rir
 *   1RM_Epley     = weight × (1 + repsTotal / 30)
 *   1RM_Brzycki   = weight × (36 / (37 − repsTotal))  — null when repsTotal ≥ 37
 *   1RM_average   = (Epley + Brzycki) / 2             — falls back to Epley when Brzycki is null
 *   unreliable    = repsTotal > 30                     — accuracy degrades above 30 reps
 *
 * @param input.weightKg       - Lifted weight in kg (must be > 0).
 * @param input.repsPerformed  - Repetitions completed (must be ≥ 1).
 * @param input.rir            - Reps in reserve at end of set (must be ≥ 0).
 * @returns `OneRmResult` with Epley, Brzycki, average estimates and reliability flag.
 * @throws {RangeError} When any input violates domain constraints.
 *
 * **Formula reference: F-16**
 */
export function computeOneRm(input: {
  weightKg: number;
  repsPerformed: number;
  rir: number;
}): OneRmResult {
  const { weightKg, repsPerformed, rir } = input;

  if (weightKg <= 0) {
    throw new RangeError(`weightKg must be > 0, received ${weightKg}`);
  }
  if (!Number.isInteger(repsPerformed) || repsPerformed < 1) {
    throw new RangeError(
      `repsPerformed must be a positive integer, received ${repsPerformed}`,
    );
  }
  if (!Number.isInteger(rir) || rir < 0) {
    throw new RangeError(`rir must be a non-negative integer, received ${rir}`);
  }

  const repsTotal = repsPerformed + rir;

  // Epley: weight × (1 + repsTotal / 30)
  const epley = weightKg * (1 + repsTotal / 30);

  // Brzycki: weight × (36 / (37 − repsTotal)) — denominator ≤ 0 makes it invalid
  const brzyckiDenominator = 37 - repsTotal;
  const brzycki: number | null =
    brzyckiDenominator > 0 ? weightKg * (36 / brzyckiDenominator) : null;

  // Average — fall back to Epley when Brzycki is not available
  const average = brzycki !== null ? (epley + brzycki) / 2 : epley;

  const unreliableWarning = repsTotal > 30;

  return { repsTotal, epley, brzycki, average, unreliableWarning };
}

// ─── F-16b: 1RM percentage table ─────────────────────────────────────────────

/**
 * Build a lookup table of weight and estimated reps for each percentage of 1RM
 * from 50 % to 100 % in 5 % increments (11 rows total).
 *
 * Per row:
 *   weightKg      = roundToHalf(percentage / 100 × oneRmAverage)
 *   repsToFailure = round((oneRm / weight − 1) / 0.0333)   — Epley inverted, capped at 30
 *
 * @param oneRmAverage - Average 1RM estimate in kg (must be > 0).
 * @returns Array of 11 `OneRmPercentageRow` objects from 50 % to 100 %.
 * @throws {RangeError} When oneRmAverage ≤ 0.
 *
 * **Formula reference: F-16b**
 */
export function buildOneRmPercentageTable(
  oneRmAverage: number,
): OneRmPercentageRow[] {
  if (oneRmAverage <= 0) {
    throw new RangeError(`oneRmAverage must be > 0, received ${oneRmAverage}`);
  }

  const rows: OneRmPercentageRow[] = [];

  for (let pct = 50; pct <= 100; pct += 5) {
    const rawWeight = (pct / 100) * oneRmAverage;
    const weightKg = roundToHalf(rawWeight);

    // Epley inverted: reps = (oneRm / weight − 1) / (1/30)
    // Avoid division by zero — weight should always be positive for pct ≥ 50 and 1RM > 0
    const rawReps =
      weightKg > 0 ? Math.round((oneRmAverage / weightKg - 1) / (1 / 30)) : 0;

    // Cap at 30 — accuracy is unreliable above this point
    const repsToFailure = Math.min(Math.max(rawReps, 0), 30);

    rows.push({ percentage: pct, weightKg, repsToFailure });
  }

  return rows;
}

// ─── F-16c: work-weight as % of 1RM ──────────────────────────────────────────

/**
 * Compute what percentage of the 1RM a given work weight represents.
 *
 * Formula: percentage = (workWeightKg / oneRmAverage) × 100
 *
 * @param workWeightKg  - Actual training weight in kg (must be > 0).
 * @param oneRmAverage  - Average 1RM estimate in kg (must be > 0).
 * @returns Percentage value, e.g. 72.5 for a weight that is 72.5 % of 1RM.
 * @throws {RangeError} When either argument is not positive.
 *
 * **Formula reference: F-16c**
 */
export function computeWorkWeightPercentage(
  workWeightKg: number,
  oneRmAverage: number,
): number {
  if (workWeightKg <= 0) {
    throw new RangeError(`workWeightKg must be > 0, received ${workWeightKg}`);
  }
  if (oneRmAverage <= 0) {
    throw new RangeError(`oneRmAverage must be > 0, received ${oneRmAverage}`);
  }
  return (workWeightKg / oneRmAverage) * 100;
}

// ─── F-17: EFC period loading prescriptions ───────────────────────────────────

/**
 * EFC period prescription configuration — private to this module.
 * Keys map to `EfcPeriod` values ('E' | 'F' | 'C').
 */
const EFC_PRESCRIPTION_CONFIG: Record<
  EfcPeriod,
  {
    percentageMin: number;
    percentageMax: number;
    seriesRange: string;
    repsRange: string;
    rirRange: string;
    focus: string;
  }
> = {
  /** Estructura — anatomical adaptation and general hypertrophy. */
  E: {
    percentageMin: 50,
    percentageMax: 70,
    seriesRange: "3–4",
    repsRange: "8–15",
    rirRange: "2–4",
    focus: "Adaptación anatómica e hipertrofia general",
  },
  /** Función — power and maximum-velocity strength. */
  F: {
    percentageMin: 70,
    percentageMax: 85,
    seriesRange: "4–6",
    repsRange: "3–5",
    rirRange: "2–3",
    focus: "Potencia y fuerza rápida a máxima velocidad",
  },
  /** Cognición — maintenance and combat transfer. */
  C: {
    percentageMin: 40,
    percentageMax: 60,
    seriesRange: "3–5",
    repsRange: "2–4",
    rirRange: "> 3",
    focus: "Mantenimiento y transferencia al combate",
  },
};

/**
 * Return a loading prescription block for the given EFC periodisation period.
 *
 * Intensity ranges and rep/series/RIR guidance by period:
 *   E (Estructura):  50–70 % / 3–4 series × 8–15 reps / RIR 2–4
 *   F (Función):     70–85 % / 4–6 series × 3–5 reps  / RIR 2–3
 *   C (Cognición):   40–60 % / 3–5 series × 2–4 reps  / RIR > 3
 *
 * @param period       - EFC periodisation phase ('E' | 'F' | 'C').
 * @param oneRmAverage - Average 1RM estimate in kg (must be > 0).
 * @returns `OneRmEfcRecommendation` with weight bounds and rep/series guidance.
 * @throws {RangeError} When oneRmAverage ≤ 0.
 *
 * **Formula reference: F-17**
 */
export function getEfcOneRmRecommendation(
  period: EfcPeriod,
  oneRmAverage: number,
): OneRmEfcRecommendation {
  if (oneRmAverage <= 0) {
    throw new RangeError(`oneRmAverage must be > 0, received ${oneRmAverage}`);
  }

  const cfg = EFC_PRESCRIPTION_CONFIG[period];

  const weightMin = roundToHalf((cfg.percentageMin / 100) * oneRmAverage);
  const weightMax = roundToHalf((cfg.percentageMax / 100) * oneRmAverage);

  return {
    period,
    percentageMin: cfg.percentageMin,
    percentageMax: cfg.percentageMax,
    weightMin,
    weightMax,
    seriesRange: cfg.seriesRange,
    repsRange: cfg.repsRange,
    rirRange: cfg.rirRange,
    focus: cfg.focus,
  };
}

// ─── F-18: Weight cut metrics ─────────────────────────────────────────────────

/**
 * Compute pre-competition weight control metrics for a single weigh-in.
 *
 * Formulas:
 *   Δ%               = ((weightCurrent − weightBaseline) / weightBaseline) × 100
 *   diffFromCategory = weightCurrent − categoryLimitKg
 *   isWithinCategory = weightCurrent ≤ categoryLimitKg
 *   highRiskAlert    = deltaPercent < −5 AND daysSinceBaseline < 7
 *
 * @param input.weightCurrent      - Today's body weight in kg (must be > 0).
 * @param input.weightBaseline     - First recorded weight of the control period (must be > 0).
 * @param input.categoryLimitKg    - Upper limit of the athlete's weight category in kg (must be > 0).
 * @param input.daysSinceBaseline  - Elapsed days since the baseline record (must be ≥ 0).
 * @throws {RangeError} When any input violates domain constraints.
 *
 * **Formula reference: F-18**
 */
export function computeWeightCutMetrics(input: {
  weightCurrent: number;
  weightBaseline: number;
  categoryLimitKg: number;
  daysSinceBaseline: number;
}): {
  deltaPercent: number;
  diffFromCategoryKg: number;
  isWithinCategory: boolean;
  highRiskAlert: boolean;
} {
  const { weightCurrent, weightBaseline, categoryLimitKg, daysSinceBaseline } =
    input;

  if (weightCurrent <= 0) {
    throw new RangeError(
      `weightCurrent must be > 0, received ${weightCurrent}`,
    );
  }
  if (weightBaseline <= 0) {
    throw new RangeError(
      `weightBaseline must be > 0, received ${weightBaseline}`,
    );
  }
  if (categoryLimitKg <= 0) {
    throw new RangeError(
      `categoryLimitKg must be > 0, received ${categoryLimitKg}`,
    );
  }
  if (!Number.isInteger(daysSinceBaseline) || daysSinceBaseline < 0) {
    throw new RangeError(
      `daysSinceBaseline must be a non-negative integer, received ${daysSinceBaseline}`,
    );
  }

  const deltaPercent =
    ((weightCurrent - weightBaseline) / weightBaseline) * 100;

  const diffFromCategoryKg = weightCurrent - categoryLimitKg;
  const isWithinCategory = weightCurrent <= categoryLimitKg;
  const highRiskAlert = deltaPercent < -5 && daysSinceBaseline < 7;

  return { deltaPercent, diffFromCategoryKg, isWithinCategory, highRiskAlert };
}
