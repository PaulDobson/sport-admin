/**
 * Domain: EFC Training — Physiological Formula Functions
 *
 * Pure calculation functions for athlete physiological metrics.
 * No side effects, no I/O — all inputs validated and errors thrown
 * with descriptive domain messages.
 *
 * Formula references:
 *   F-07  IMC (Body Mass Index)
 *   F-08  FCMax — Tanaka et al. (2001)
 *   F-09  TMB — Mifflin–St Jeor (1990)
 *   F-10  FCR (Heart Rate Reserve) — Karvonen method
 *   F-11  VO2max — Cooper 12-minute run test
 *   F-12  Percentage change between evaluations
 */

import type { ImcClassification, PhysiologicalMetrics } from './computed-metrics';

// ─── F-07: IMC / Body Mass Index ──────────────────────────────────────────────

/**
 * @formula F-07
 * Computes Body Mass Index: IMC = weightKg / (heightCm / 100)²
 *
 * @param weightKg  Body weight in kg (must be > 0)
 * @param heightCm  Height in centimetres (must be > 0)
 * @returns IMC value in kg/m²
 * @throws {RangeError} When weightKg or heightCm are not positive finite numbers
 */
export function computeImc(weightKg: number, heightCm: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError(
      `F-07 computeImc: weightKg must be a positive finite number, got ${weightKg}`,
    );
  }
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new RangeError(
      `F-07 computeImc: heightCm must be a positive finite number, got ${heightCm}`,
    );
  }

  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * @formula F-07
 * Classifies an IMC value using WHO thresholds.
 *
 * | Range            | Classification  |
 * |------------------|-----------------|
 * | IMC < 18.5       | bajo_peso       |
 * | 18.5 ≤ IMC < 25  | normal          |
 * | 25 ≤ IMC < 30    | sobrepeso       |
 * | 30 ≤ IMC < 35    | obesidad_i      |
 * | 35 ≤ IMC < 40    | obesidad_ii     |
 * | IMC ≥ 40         | obesidad_iii    |
 *
 * @param imc  IMC value in kg/m²
 * @throws {RangeError} When imc is not a positive finite number
 */
export function classifyImc(imc: number): ImcClassification {
  if (!Number.isFinite(imc) || imc <= 0) {
    throw new RangeError(
      `F-07 classifyImc: imc must be a positive finite number, got ${imc}`,
    );
  }

  if (imc < 18.5) return 'bajo_peso';
  if (imc < 25.0) return 'normal';
  if (imc < 30.0) return 'sobrepeso';
  if (imc < 35.0) return 'obesidad_i';
  if (imc < 40.0) return 'obesidad_ii';
  return 'obesidad_iii';
}

// ─── F-08: FCMax — Tanaka et al. ──────────────────────────────────────────────

/**
 * @formula F-08
 * Computes age in complete years from an ISO 8601 birth date string
 * relative to today's date.
 *
 * @param birthDate  ISO date string, e.g. "1990-04-15" or full ISO timestamp
 * @returns Age in complete years (integer ≥ 0)
 * @throws {RangeError} When birthDate is invalid or refers to a future date
 */
export function computeAgeFromBirthDate(birthDate: string): number {
  const birth = new Date(birthDate);

  if (isNaN(birth.getTime())) {
    throw new RangeError(
      `F-08 computeAgeFromBirthDate: invalid birthDate "${birthDate}"`,
    );
  }

  const today = new Date();

  if (birth > today) {
    throw new RangeError(
      `F-08 computeAgeFromBirthDate: birthDate "${birthDate}" is in the future`,
    );
  }

  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}

/**
 * @formula F-08
 * Estimates maximum heart rate using the Tanaka et al. (2001) formula:
 *   FCMax = 208 − (0.7 × age)
 *
 * Reference: Tanaka H, Monahan KD, Seals DR. Age-predicted maximal heart rate
 * revisited. J Am Coll Cardiol. 2001;37(1):153–156.
 *
 * @param birthDate  ISO date string, e.g. "1990-04-15"
 * @returns Estimated FCMax in bpm (rounded to nearest integer)
 * @throws {RangeError} When birthDate is invalid or future
 */
export function computeFcMax(birthDate: string): number {
  const age = computeAgeFromBirthDate(birthDate);
  return Math.round(208 - 0.7 * age);
}

// ─── F-09: TMB — Mifflin–St Jeor ─────────────────────────────────────────────

/**
 * @formula F-09
 * Computes Total Metabolic Rate (basal metabolic rate) in kcal/day
 * using the Mifflin–St Jeor (1990) formula.
 *
 *   Male:   TMB = (10 × weightKg) + (6.25 × heightCm) − (5 × age) + 5
 *   Female: TMB = (10 × weightKg) + (6.25 × heightCm) − (5 × age) − 161
 *
 * Reference: Mifflin MD, St Jeor ST, et al. A new predictive equation for
 * resting energy expenditure in healthy individuals.
 * Am J Clin Nutr. 1990;51(2):241–247.
 *
 * @param weightKg  Body weight in kg (must be > 0)
 * @param heightCm  Height in centimetres (must be > 0)
 * @param age       Age in complete years (must be ≥ 0)
 * @param gender    Biological sex for formula selection: 'male' | 'female'
 * @returns TMB in kcal/day (rounded to nearest integer)
 * @throws {RangeError} When any numeric input is out of valid range
 */
export function computeTmb(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female',
): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError(
      `F-09 computeTmb: weightKg must be a positive finite number, got ${weightKg}`,
    );
  }
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new RangeError(
      `F-09 computeTmb: heightCm must be a positive finite number, got ${heightCm}`,
    );
  }
  if (!Number.isFinite(age) || age < 0) {
    throw new RangeError(
      `F-09 computeTmb: age must be a non-negative finite number, got ${age}`,
    );
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const sexAdjustment = gender === 'male' ? 5 : -161;

  return Math.round(base + sexAdjustment);
}

// ─── F-10: FCR — Karvonen Heart Rate Reserve ──────────────────────────────────

/**
 * @formula F-10
 * Computes Heart Rate Reserve (Frecuencia Cardíaca de Reserva) using the
 * Karvonen method:
 *   FCR = FCMax − FCRest
 *
 * @param fcMax   Maximum heart rate in bpm (must be > fcRest)
 * @param fcRest  Resting heart rate in bpm (must be > 0)
 * @returns FCR in bpm
 * @throws {RangeError} When inputs are invalid or fcMax ≤ fcRest
 */
export function computeFcr(fcMax: number, fcRest: number): number {
  if (!Number.isFinite(fcMax) || fcMax <= 0) {
    throw new RangeError(
      `F-10 computeFcr: fcMax must be a positive finite number, got ${fcMax}`,
    );
  }
  if (!Number.isFinite(fcRest) || fcRest <= 0) {
    throw new RangeError(
      `F-10 computeFcr: fcRest must be a positive finite number, got ${fcRest}`,
    );
  }
  if (fcMax <= fcRest) {
    throw new RangeError(
      `F-10 computeFcr: fcMax (${fcMax}) must be greater than fcRest (${fcRest})`,
    );
  }

  return fcMax - fcRest;
}

/**
 * @formula F-10
 * Computes target heart rate using the Karvonen formula:
 *   FC_objetivo = FCRest + (FCR × intensityFraction)
 *
 * @param fcRest            Resting heart rate in bpm (must be > 0)
 * @param fcr               Heart Rate Reserve in bpm (must be > 0)
 * @param intensityFraction Training intensity as a fraction in [0, 1]
 * @returns Target heart rate in bpm (rounded to nearest integer)
 * @throws {RangeError} When any input is out of valid range
 */
export function computeFcObjetivo(
  fcRest: number,
  fcr: number,
  intensityFraction: number,
): number {
  if (!Number.isFinite(fcRest) || fcRest <= 0) {
    throw new RangeError(
      `F-10 computeFcObjetivo: fcRest must be a positive finite number, got ${fcRest}`,
    );
  }
  if (!Number.isFinite(fcr) || fcr <= 0) {
    throw new RangeError(
      `F-10 computeFcObjetivo: fcr must be a positive finite number, got ${fcr}`,
    );
  }
  if (!Number.isFinite(intensityFraction) || intensityFraction < 0 || intensityFraction > 1) {
    throw new RangeError(
      `F-10 computeFcObjetivo: intensityFraction must be in [0, 1], got ${intensityFraction}`,
    );
  }

  return Math.round(fcRest + fcr * intensityFraction);
}

// ─── F-11: VO2max — Cooper 12-minute run test ─────────────────────────────────

/**
 * @formula F-11
 * Estimates VO2max from the distance covered in the Cooper 12-minute run test:
 *   VO2max = (distanceMeters − 504.9) / 44.73
 *
 * Reference: Cooper KH. A means of assessing maximal oxygen intake.
 * JAMA. 1968;203(3):201–204.
 *
 * @param distanceMeters  Distance covered in 12 minutes (must be > 0)
 * @returns VO2max estimate in mL·kg⁻¹·min⁻¹
 * @throws {RangeError} When distanceMeters is not a positive finite number
 */
export function computeVo2max(distanceMeters: number): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    throw new RangeError(
      `F-11 computeVo2max: distanceMeters must be a positive finite number, got ${distanceMeters}`,
    );
  }

  return (distanceMeters - 504.9) / 44.73;
}

// ─── F-12: Percentage change between evaluations ──────────────────────────────

/**
 * @formula F-12
 * Computes the percentage change between two evaluation values:
 *   Δ% = ((current − baseline) / |baseline|) × 100
 *
 * Uses the absolute value of `baseline` to correctly handle measurements
 * that can be negative (e.g. Seat-and-Reach flexibility test where negative
 * values indicate inability to reach toes).
 *
 * @param current   Current evaluation value
 * @param baseline  Baseline evaluation value (must not be 0)
 * @returns Percentage change, or `null` when baseline is 0 (division undefined)
 * @throws {TypeError} When either argument is not a finite number
 */
export function computeDeltaPercent(current: number, baseline: number): number | null {
  if (!Number.isFinite(current)) {
    throw new TypeError(
      `F-12 computeDeltaPercent: current must be a finite number, got ${current}`,
    );
  }
  if (!Number.isFinite(baseline)) {
    throw new TypeError(
      `F-12 computeDeltaPercent: baseline must be a finite number, got ${baseline}`,
    );
  }

  if (baseline === 0) {
    return null;
  }

  return ((current - baseline) / Math.abs(baseline)) * 100;
}

// ─── Combined: computePhysiologicalMetrics ────────────────────────────────────

/**
 * Input bag for `computePhysiologicalMetrics`.
 * All fields are nullable — the function computes only the metrics whose
 * required inputs are present and returns `null` for the rest.
 */
export interface PhysiologicalMetricsInput {
  weightKg: number | null;
  heightCm: number | null;
  birthDate: string | null;
  gender: 'male' | 'female' | null;
  fcRest: number | null;
  /** Distance covered in the Cooper 12-minute run test in metres. */
  cooperDistanceMeters: number | null;
}

/**
 * Computes all physiological metrics that can be derived from the available
 * input data.  Any metric whose required inputs are missing or invalid returns
 * `null` rather than throwing.
 *
 * | Metric              | Required inputs                              |
 * |---------------------|----------------------------------------------|
 * | imc                 | weightKg, heightCm                           |
 * | imcClassification   | imc (derived)                                |
 * | fcMax               | birthDate                                    |
 * | tmb                 | weightKg, heightCm, birthDate, gender        |
 * | fcr                 | birthDate, fcRest (fcMax derived)            |
 * | vo2max              | cooperDistanceMeters                         |
 * | estimatedDailyCalories | tmb (derived) — currently not computed   |
 *
 * @param input  Nullable physiological data bag
 * @returns `PhysiologicalMetrics` with null for any uncomputable field
 */
export function computePhysiologicalMetrics(
  input: PhysiologicalMetricsInput,
): PhysiologicalMetrics {
  const { weightKg, heightCm, birthDate, gender, fcRest, cooperDistanceMeters } = input;

  // ── F-07: IMC ──
  let imc: number | null = null;
  let imcClassification: PhysiologicalMetrics['imcClassification'] = null;

  if (weightKg !== null && heightCm !== null) {
    try {
      imc = computeImc(weightKg, heightCm);
      imcClassification = classifyImc(imc);
    } catch {
      imc = null;
      imcClassification = null;
    }
  }

  // ── F-08: FCMax ──
  let fcMax: number | null = null;
  let age: number | null = null;

  if (birthDate !== null) {
    try {
      age = computeAgeFromBirthDate(birthDate);
      fcMax = computeFcMax(birthDate);
    } catch {
      fcMax = null;
      age = null;
    }
  }

  // ── F-09: TMB ──
  let tmb: number | null = null;

  if (weightKg !== null && heightCm !== null && age !== null && gender !== null) {
    try {
      tmb = computeTmb(weightKg, heightCm, age, gender);
    } catch {
      tmb = null;
    }
  }

  // ── F-10: FCR ──
  let fcr: number | null = null;

  if (fcMax !== null && fcRest !== null) {
    try {
      fcr = computeFcr(fcMax, fcRest);
    } catch {
      // fcMax ≤ fcRest is a data-quality issue — degrade gracefully
      fcr = null;
    }
  }

  // ── F-11: VO2max ──
  let vo2max: number | null = null;

  if (cooperDistanceMeters !== null) {
    try {
      vo2max = computeVo2max(cooperDistanceMeters);
    } catch {
      vo2max = null;
    }
  }

  // ── Estimated daily calories — not yet implemented (requires activity factor) ──
  const estimatedDailyCalories: number | null = null;

  return {
    imc,
    imcClassification,
    fcMax,
    tmb,
    fcr,
    vo2max,
    estimatedDailyCalories,
  };
}
