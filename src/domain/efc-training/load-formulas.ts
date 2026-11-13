/**
 * Domain: EFC Training — Load Formulas
 *
 * Pure functions for computing session and weekly training loads using the
 * Foster session-RPE methodology and the Acute:Chronic Workload Ratio (ACWR).
 *
 * All functions are side-effect-free and depend only on their arguments.
 *
 * Formulas implemented:
 *   F-13  Session RPE (sRPE) — Foster et al.
 *   F-14  Weekly load, Monotonía Foster, and Strain
 *   F-15  Acute:Chronic Workload Ratio (ACWR)
 *
 * References:
 *   - Foster, C. et al. (2001). "A new approach to monitoring exercise training."
 *     Journal of Strength and Conditioning Research, 15(1), 109–115.
 *     https://doi.org/10.1519/00124278-200102000-00019
 *
 *   - Gabbett, T. J. (2016). "The training-injury prevention paradox: should athletes
 *     be training smarter and harder?" British Journal of Sports Medicine, 50(5), 273–280.
 *     https://doi.org/10.1136/bjsports-2015-095788
 *
 *   - Hulin, B. T. et al. (2016). "Spikes in acute workload are associated with
 *     increased injury risk in elite cricket fast bowlers." British Journal of Sports
 *     Medicine, 48(8), 708–712. https://doi.org/10.1136/bjsports-2013-092524
 */

import type {
  AcwrResult,
  AcwrZone,
  FosterMonotonyResult,
} from "./computed-metrics";

// ─── Re-exports for convenience ───────────────────────────────────────────────

export type { AcwrResult, AcwrZone, FosterMonotonyResult };

// ─── F-13: Session RPE (sRPE) ─────────────────────────────────────────────────

/**
 * **F-13 · Session RPE (Foster, 2001)**
 *
 * Computes the session training load as the product of the athlete's perceived
 * exertion (RPE) and the session duration in minutes.
 *
 *   sRPE = RPE × durationMinutes
 *
 * The result is an integer (no rounding is applied — the product of two integers
 * is always an integer when inputs are within their valid ranges).
 *
 * @param rpe              - CR-10 perceived exertion rating (integer 1–10)
 * @param durationMinutes  - Session duration in minutes (integer 1–480)
 * @returns                  Session training load (arbitrary units)
 *
 * @see Foster et al. (2001), J Strength Cond Res 15(1):109-115.
 */
export function computeSrpe(rpe: number, durationMinutes: number): number {
  return rpe * durationMinutes;
}

// ─── F-14: Weekly load, Monotonía Foster, and Strain ─────────────────────────

/**
 * **F-14 · Foster Weekly Load, Monotonía, and Strain**
 *
 * Derives the four Foster load-monitoring metrics from an array of daily sRPE
 * values covering a 7-day training week. Missing days must be supplied as 0.
 *
 * ```
 * weeklyLoad = Σ(sRPE_i)                 for i = 1..7
 * dailyMean  = weeklyLoad / 7
 * dailySD    = √( Σ((sRPE_i − dailyMean)²) / 7 )    ← population SD
 * monotony   = dailyMean / dailySD        (null when SD = 0)
 * strain     = weeklyLoad × monotony      (null when monotony is null)
 * ```
 *
 * A `highMonotonyWarning` flag is set whenever `monotony > 2.0`, which Foster
 * identifies as a threshold associated with elevated injury and illness risk.
 *
 * @param dailySrpe - Array of daily sRPE values (up to 7 elements). Values
 *                    for days beyond the first 7 are ignored. Shorter arrays
 *                    are padded with zeros to reach 7 days.
 * @returns           `FosterMonotonyResult` with the four metrics and warning flag.
 *
 * @see Foster et al. (2001), J Strength Cond Res 15(1):109-115.
 */
export function computeFosterWeeklyMetrics(
  dailySrpe: number[],
): FosterMonotonyResult {
  // Normalise to exactly 7 slots, padding any missing days with 0
  const days: number[] = Array.from({ length: 7 }, (_, i) => dailySrpe[i] ?? 0);

  const weeklyLoad = days.reduce((sum, v) => sum + v, 0);
  const dailyMean = weeklyLoad / 7;

  // Population standard deviation
  const variance =
    days.reduce((sum, v) => sum + Math.pow(v - dailyMean, 2), 0) / 7;
  const dailySD = Math.sqrt(variance);

  if (dailySD === 0) {
    return {
      weeklyLoad,
      dailyMean,
      dailySD: 0,
      monotony: null,
      strain: null,
      highMonotonyWarning: false,
    };
  }

  const monotony = dailyMean / dailySD;
  const strain = weeklyLoad * monotony;

  return {
    weeklyLoad,
    dailyMean,
    dailySD,
    monotony,
    strain,
    highMonotonyWarning: monotony > 2.0,
  };
}

// ─── F-15: ACWR ───────────────────────────────────────────────────────────────

/**
 * Input record for a single day's training load.
 * The `date` field must be an ISO 8601 date string (YYYY-MM-DD or full ISO).
 */
export interface DailyLoad {
  date: string;
  srpe: number;
}

/**
 * **F-15 · Acute:Chronic Workload Ratio (ACWR)**
 *
 * Computes the ACWR from a time-series of daily sRPE records (the most common
 * implementation of the "rolling averages" model described by Gabbett 2016):
 *
 * ```
 * CA   = (Σ sRPE over last 7 days)  / 7      ← acute load
 * CC   = (Σ sRPE over last 28 days) / 28     ← chronic load
 * ACWR = CA / CC                              (null when CC = 0)
 * ```
 *
 * Zone classification thresholds (Hulin et al. 2016 / Gabbett 2016):
 *
 * | ACWR         | Zone          |
 * |--------------|---------------|
 * | < 0.8        | `undertrained`|
 * | 0.8 – 1.3    | `optimal`     |
 * | 1.3 – 1.5    | `caution`     |
 * | > 1.5        | `danger`      |
 *
 * **Date handling:**
 * - Duplicate dates are summed (e.g. two sessions on the same day).
 * - The function determines the reference date as the latest date present in
 *   the input array; all windows are relative to that reference date.
 * - If `daysOfData < 7`, CA is calculated with available days but
 *   `insufficientData` is set to `true`.
 * - If `daysOfData < 28`, CC is calculated with available days but
 *   `insufficientData` is set to `true`.
 * - An empty array returns a zeroed result with `insufficientData: true`.
 *
 * @param dailyLoads - Array of `{ date, srpe }` records; order does not matter.
 * @returns            `AcwrResult` with CA, CC, ACWR, zone, and data quality flags.
 *
 * @see Gabbett (2016), Br J Sports Med 50(5):273-280.
 * @see Hulin et al. (2016), Br J Sports Med 48(8):708-712.
 */
export function computeAcwr(dailyLoads: DailyLoad[]): AcwrResult {
  // ── Edge case: empty array ───────────────────────────────────────────────
  if (dailyLoads.length === 0) {
    return {
      ca: 0,
      cc: 0,
      acwr: null,
      zone: null,
      insufficientData: true,
      daysOfData: 0,
    };
  }

  // ── 1. Aggregate duplicate dates ─────────────────────────────────────────
  const sumByDate = new Map<string, number>();
  for (const { date, srpe } of dailyLoads) {
    // Normalise to YYYY-MM-DD to safely compare dates regardless of time parts
    const day = date.slice(0, 10);
    sumByDate.set(day, (sumByDate.get(day) ?? 0) + srpe);
  }

  // ── 2. Find the reference date (latest date in the dataset) ──────────────
  const sortedDates = Array.from(sumByDate.keys()).sort(); // lexicographic = chronological for ISO dates
  const referenceDate = sortedDates[sortedDates.length - 1];
  const referenceMs = new Date(referenceDate).getTime();

  const daysOfData = sortedDates.length;

  // ── 3. Collect loads within each rolling window ──────────────────────────
  let acuteSum = 0; // last 7 days
  let chronicSum = 0; // last 28 days

  sumByDate.forEach((load, day) => {
    const diffDays = Math.round(
      (referenceMs - new Date(day).getTime()) / 86_400_000,
    );
    if (diffDays < 7) {
      acuteSum += load;
    }
    if (diffDays < 28) {
      chronicSum += load;
    }
  });

  // ── 4. Compute rolling means ─────────────────────────────────────────────
  const ca = acuteSum / 7;
  const cc = chronicSum / 28;

  // ── 5. ACWR and zone ─────────────────────────────────────────────────────
  const acwr = cc === 0 ? null : ca / cc;
  const zone: AcwrZone | null = acwr === null ? null : classifyAcwrZone(acwr);

  // ── 6. Insufficient-data flag ─────────────────────────────────────────────
  const insufficientData = daysOfData < 28;

  return { ca, cc, acwr, zone, insufficientData, daysOfData };
}

// ─── F-15 (helper): ACWR zone classification ─────────────────────────────────

/**
 * **F-15 · ACWR Zone Classification**
 *
 * Maps a computed ACWR value to one of the four risk zones.
 *
 * | ACWR         | Zone          |
 * |--------------|---------------|
 * | < 0.8        | `undertrained`|
 * | 0.8 – 1.3    | `optimal`     |
 * | 1.3 – 1.5    | `caution`     |
 * | > 1.5        | `danger`      |
 *
 * The boundary at 1.3 belongs to `optimal` (≤ 1.3) and the boundary at 1.5
 * belongs to `caution` (≤ 1.5). This matches the interval convention used by
 * Gabbett (2016).
 *
 * @param acwr - A positive ACWR value.
 * @returns      The corresponding `AcwrZone` label.
 */
export function classifyAcwrZone(acwr: number): AcwrZone {
  if (acwr < 0.8) return "undertrained";
  if (acwr <= 1.3) return "optimal";
  if (acwr <= 1.5) return "caution";
  return "danger";
}
