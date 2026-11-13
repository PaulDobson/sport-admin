/**
 * Domain: EFC Training
 *
 * Shared enums, constants and scale types used across the EFC training domain.
 * EFC stands for Estructura / Función / Cognición — the three training periods
 * that make up a macrocycle periodisation model.
 */

// ─── Enumerations ─────────────────────────────────────────────────────────────

/** The three EFC periodisation phases. */
export type EfcPeriod = 'E' | 'F' | 'C';

/** Microcycle classification type. */
export type MicrocycleType = 'AJ' | 'C' | 'I' | 'AC' | 'CO' | 'R';

/** Perceived effort / intensity scale (Borg CR-10), 0–9. */
export type IntensityScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// ─── Labels & colours ────────────────────────────────────────────────────────

/** Human-readable labels for each intensity level. */
export const INTENSITY_LABELS: Record<IntensityScale, string> = {
  0: 'Reposo',
  1: 'Muy muy suave',
  2: 'Muy suave',
  3: 'Suave',
  4: 'Algo duro',
  5: 'Duro',
  6: 'Más duro',
  7: 'Muy duro',
  8: 'Muy muy duro',
  9: 'Máximo',
};

/** Human-readable labels for each microcycle type. */
export const MICROCYCLE_TYPE_LABELS: Record<MicrocycleType, string> = {
  AJ: 'Ajuste',
  C: 'Carga',
  I: 'Impacto',
  AC: 'Activación',
  CO: 'Competitivo',
  R: 'Recuperación',
};

/** Human-readable labels for each EFC period. */
export const EFC_PERIOD_LABELS: Record<EfcPeriod, string> = {
  E: 'Estructura',
  F: 'Función',
  C: 'Cognición',
};

/** Tailwind colour tokens for each EFC period (used by UI components). */
export const EFC_PERIOD_COLORS: Record<EfcPeriod, string> = {
  E: 'blue',
  F: 'green',
  C: 'amber',
};
