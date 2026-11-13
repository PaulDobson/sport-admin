/**
 * Domain: EFC Training
 *
 * Pure formula functions F-01 to F-06 for the EFC periodisation model.
 * All functions are side-effect free: they accept primitives and return primitives.
 * No I/O, no network calls, no global state mutations.
 *
 * Formula references map to the spec's Mathematical Formulas Reference section.
 */

import type { MacrocycleDistribution } from './computed-metrics';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Round a number to 1 decimal place. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── F-04 output type ─────────────────────────────────────────────────────────

/**
 * Full internal breakdown for the Estructura (E) stage.
 * Produced by F-04: computeEstructuraSubdistribution.
 */
export interface EstructuraSubdistribution {
  // ── Top-level blocks ───────────────────────────────────────────────────────
  /** Adaptación Anatómica = T_Estructura × 0.10 */
  adaptAnatomica: number;
  /** Capacidades Condicionales = T_Estructura × 0.20 */
  condicional: number;
  /** Capacidades Coordinativas = T_Estructura × 0.20 */
  coordinativo: number;
  /** Técnica = T_Estructura × 0.30 */
  tecnico: number;
  /** Táctica Simple = T_Estructura × 0.20 */
  tacticoSimple: number;

  // ── Adaptación Anatómica sub-blocks ──────────────────────────────────────
  /** Estable = T_AdaptAnat_E × 0.50 */
  adaptAnatomicaEstable: number;
  /** Inestable = T_AdaptAnat_E × 0.50 */
  adaptAnatomicaInestable: number;

  // ── Condicionales sub-blocks ──────────────────────────────────────────────
  /** Fuerza = T_Condicional_E × 0.40 */
  condicionalFuerza: number;
  /** Velocidad = T_Condicional_E × 0.30 */
  condicionalVelocidad: number;
  /** Resistencia = T_Condicional_E × 0.20 */
  condicionalResistencia: number;
  /** Flexibilidad = T_Condicional_E × 0.10 */
  condicionalFlexibilidad: number;

  // ── Coordinativas sub-blocks ──────────────────────────────────────────────
  /** Diferenciación = T_Coordinativo_E × 0.10 */
  coordinativoDiferenciacion: number;
  /** Acoplamiento = T_Coordinativo_E × 0.10 */
  coordinativoAcoplamiento: number;
  /** Orientación = T_Coordinativo_E × 0.20 */
  coordinativoOrientacion: number;
  /** Equilibrio = T_Coordinativo_E × 0.20 */
  coordinativoEquilibrio: number;
  /** Cambio = T_Coordinativo_E × 0.10 */
  coordinativoCambio: number;
  /** Rítmica = T_Coordinativo_E × 0.10 */
  coordinativoRitmica: number;
  /** Relajación = T_Coordinativo_E × 0.20 */
  coordinativoRelajacion: number;

  // ── Técnica sub-blocks ────────────────────────────────────────────────────
  /** Patadas = T_Tecnico_E × 0.50 */
  tecnicoPatadas: number;
  /** Puños = T_Tecnico_E × 0.10 */
  tecnicoPunos: number;
  /** Bloqueos = T_Tecnico_E × 0.20 */
  tecnicoBloqueos: number;
  /** Desplazamiento = T_Tecnico_E × 0.20 */
  tecnicoDesplazamiento: number;

  // ── Táctica Simple sub-blocks ─────────────────────────────────────────────
  /** Aprendizaje = T_TacSimple_E × 0.50 */
  tacticoAprendizaje: number;
  /** Mecanización = T_TacSimple_E × 0.40 */
  tacticoMecanizacion: number;
  /** Automatización = T_TacSimple_E × 0.10 */
  tacticoAutomatizacion: number;
}

// ─── F-05 output type ─────────────────────────────────────────────────────────

/**
 * Full internal breakdown for the Función (F) stage.
 * Produced by F-05: computeFuncionSubdistribution.
 */
export interface FuncionSubdistribution {
  // ── Top-level blocks ───────────────────────────────────────────────────────
  /** Capacidades Condicionales = T_Función × 0.30 */
  condicional: number;
  /** Capacidades Coordinativas = T_Función × 0.15 */
  coordinativo: number;
  /** Técnica = T_Función × 0.10 */
  tecnico: number;
  /** Táctica Simple = T_Función × 0.30 */
  tacticoSimple: number;
  /** Táctica Compleja = T_Función × 0.15 */
  tacticoComplejo: number;

  // ── Condicionales sub-blocks ──────────────────────────────────────────────
  /** Fuerza = T_Condicional_F × 0.30 */
  condicionalFuerza: number;
  /** Resistencia = T_Condicional_F × 0.30 */
  condicionalResistencia: number;
  /** Velocidad = T_Condicional_F × 0.30 */
  condicionalVelocidad: number;
  /** Flexibilidad = T_Condicional_F × 0.10 */
  condicionalFlexibilidad: number;

  // ── Coordinativas sub-blocks ──────────────────────────────────────────────
  /** Diferenciación = T_Coordinativo_F × 0.10 */
  coordinativoDiferenciacion: number;
  /** Acoplamiento = T_Coordinativo_F × 0.10 */
  coordinativoAcoplamiento: number;
  /** Orientación = T_Coordinativo_F × 0.20 */
  coordinativoOrientacion: number;
  /** Equilibrio = T_Coordinativo_F × 0.20 */
  coordinativoEquilibrio: number;
  /** Cambio = T_Coordinativo_F × 0.10 */
  coordinativoCambio: number;
  /** Rítmica = T_Coordinativo_F × 0.10 */
  coordinativoRitmica: number;
  /** Relajación = T_Coordinativo_F × 0.20 */
  coordinativoRelajacion: number;

  // ── Técnica sub-blocks ────────────────────────────────────────────────────
  /** Patadas = T_Tecnico_F × 0.50 */
  tecnicoPatadas: number;
  /** Puños = T_Tecnico_F × 0.10 */
  tecnicoPunos: number;
  /** Bloqueos = T_Tecnico_F × 0.20 */
  tecnicoBloqueos: number;
  /** Desplazamiento = T_Tecnico_F × 0.20 */
  tecnicoDesplazamiento: number;

  // ── Táctica Simple sub-blocks ─────────────────────────────────────────────
  /** Aprendizaje = T_TacSimple_F × 0.10 */
  tacticoSimpleAprendizaje: number;
  /** Mecanización = T_TacSimple_F × 0.50 */
  tacticoSimpleMecanizacion: number;
  /** Automatización = T_TacSimple_F × 0.40 */
  tacticoSimpleAutomatizacion: number;

  // ── Táctica Compleja sub-blocks ───────────────────────────────────────────
  /** Decisión 3 situaciones = T_TacComplejo_F × 0.60 */
  tacticoComplejoDecision3: number;
  /** Decisión 5 situaciones = T_TacComplejo_F × 0.40 */
  tacticoComplejoDecision5: number;
}

// ─── F-06 output type ─────────────────────────────────────────────────────────

/**
 * Full internal breakdown for the Cognición (C) stage.
 * Produced by F-06: computeCognicionSubdistribution.
 */
export interface CognicionSubdistribution {
  // ── Top-level blocks ───────────────────────────────────────────────────────
  /** Capacidades Condicionales = T_Cognición × 0.28 */
  condicional: number;
  /** Capacidades Coordinativas = T_Cognición × 0.18 */
  coordinativo: number;
  /** Táctica Compleja = T_Cognición × 0.54 */
  tacticoComplejo: number;

  // ── Condicionales sub-blocks ──────────────────────────────────────────────
  /** Fuerza = T_Condicional_C × 0.40 */
  condicionalFuerza: number;
  /** Resistencia = T_Condicional_C × 0.20 */
  condicionalResistencia: number;
  /** Velocidad = T_Condicional_C × 0.30 */
  condicionalVelocidad: number;
  /** Flexibilidad = T_Condicional_C × 0.10 */
  condicionalFlexibilidad: number;

  // ── Coordinativas sub-blocks ──────────────────────────────────────────────
  /** Diferenciación = T_Coordinativo_C × 0.10 */
  coordinativoDiferenciacion: number;
  /** Acoplamiento = T_Coordinativo_C × 0.10 */
  coordinativoAcoplamiento: number;
  /** Orientación = T_Coordinativo_C × 0.30 */
  coordinativoOrientacion: number;
  /** Equilibrio = T_Coordinativo_C × 0.20 */
  coordinativoEquilibrio: number;
  /** Cambio = T_Coordinativo_C × 0.05 */
  coordinativoCambio: number;
  /** Rítmica = T_Coordinativo_C × 0.05 */
  coordinativoRitmica: number;
  /** Relajación = T_Coordinativo_C × 0.20 */
  coordinativoRelajacion: number;

  // ── Táctica Compleja sub-blocks ───────────────────────────────────────────
  /** Decisión 3 situaciones = T_TacComplejo_C × 0.30 */
  tacticoComplejoDecision3: number;
  /** Decisión 5 situaciones = T_TacComplejo_C × 0.70 */
  tacticoComplejoDecision5: number;
}

// ─── F-01: Macrocycle volume ──────────────────────────────────────────────────

/**
 * F-01 — Volumen Total del Macrociclo
 *
 * ```
 * Días_Totales = Fecha_Competencia − Fecha_Inicio   [días]
 * Semanas_Totales = floor(Días_Totales / 7)          [semanas enteras]
 * Volumen_Total_min = Semanas_Totales × Sesiones_por_Semana × Minutos_por_Sesión
 * Volumen_Total_hr  = Volumen_Total_min / 60
 * ```
 *
 * @throws {Error} When competitionDate ≤ startDate.
 * @throws {Error} When totalWeeks < 10.
 * @throws {Error} When any numeric parameter is out of its valid range.
 */
export function computeMacrocycleVolume(input: {
  /** ISO date string (YYYY-MM-DD). First day of the macrocycle. */
  startDate: string;
  /** ISO date string (YYYY-MM-DD). Target competition date. */
  competitionDate: string;
  /** Planned session duration in hours. Valid range: 0.5–8.0. */
  hoursPerSession: number;
  /** Number of training days per week. Valid range: 1–7. */
  trainingDaysPerWeek: number;
  /** Number of sessions per training day. Valid range: 1–5. */
  sessionsPerDay: number;
}): {
  totalDays: number;
  totalWeeks: number;
  totalMinutes: number;
  totalHours: number;
} {
  const { startDate, competitionDate, hoursPerSession, trainingDaysPerWeek, sessionsPerDay } = input;

  // Validate numeric params
  if (hoursPerSession < 0.5 || hoursPerSession > 8.0) {
    throw new Error(
      `hoursPerSession must be between 0.5 and 8.0, received: ${hoursPerSession}`,
    );
  }
  if (!Number.isInteger(trainingDaysPerWeek) || trainingDaysPerWeek < 1 || trainingDaysPerWeek > 7) {
    throw new Error(
      `trainingDaysPerWeek must be an integer between 1 and 7, received: ${trainingDaysPerWeek}`,
    );
  }
  if (!Number.isInteger(sessionsPerDay) || sessionsPerDay < 1 || sessionsPerDay > 5) {
    throw new Error(
      `sessionsPerDay must be an integer between 1 and 5, received: ${sessionsPerDay}`,
    );
  }

  // Parse dates — using UTC midnight to avoid DST offsets
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${competitionDate}T00:00:00Z`);

  if (isNaN(start.getTime())) {
    throw new Error(`Invalid startDate: "${startDate}"`);
  }
  if (isNaN(end.getTime())) {
    throw new Error(`Invalid competitionDate: "${competitionDate}"`);
  }
  if (end.getTime() <= start.getTime()) {
    throw new Error(
      `competitionDate must be after startDate (got startDate="${startDate}", competitionDate="${competitionDate}")`,
    );
  }

  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  const totalWeeks = Math.floor(totalDays / 7);

  if (totalWeeks < 10) {
    throw new Error(
      `Macrocycle must span at least 10 weeks; calculated totalWeeks=${totalWeeks} (${totalDays} days).`,
    );
  }

  // F-01: Sesiones_por_Semana = trainingDaysPerWeek × sessionsPerDay
  // F-01: Minutos_por_Sesión  = hoursPerSession × 60
  const sessionsPerWeek = trainingDaysPerWeek * sessionsPerDay;
  const minutesPerSession = hoursPerSession * 60;
  const totalMinutes = round1(totalWeeks * sessionsPerWeek * minutesPerSession);
  const totalHours = round1(totalMinutes / 60);

  return { totalDays, totalWeeks, totalMinutes, totalHours };
}

// ─── F-02: EFC distribution ───────────────────────────────────────────────────

/**
 * F-02 — Distribución EFC del Macrociclo
 *
 * Distributes totalMinutes across the three EFC stages using the given percentages.
 * Also calculates the week counts per stage proportionally.
 *
 * ```
 * T_Estructura = totalMinutes × (%E / 100)
 * T_Función    = totalMinutes × (%F / 100)
 * T_Cognición  = totalMinutes × (%C / 100)
 *
 * Semanas_E = totalWeeks × (%E / 100)
 * Semanas_F = totalWeeks × (%F / 100)
 * Semanas_C = totalWeeks × (%C / 100)
 * ```
 *
 * @throws {Error} When ePercentage + fPercentage + cPercentage ≠ 100.
 * @throws {Error} When any percentage is negative.
 * @throws {Error} When totalMinutes or totalWeeks is negative.
 */
export function computeEfcDistribution(input: {
  totalMinutes: number;
  totalWeeks: number;
  /** Percentage for Estructura stage (0–100). */
  ePercentage: number;
  /** Percentage for Función stage (0–100). */
  fPercentage: number;
  /** Percentage for Cognición stage (0–100). */
  cPercentage: number;
}): {
  estructuraMinutes: number;
  funcionMinutes: number;
  cognicionMinutes: number;
  estructuraSemanas: number;
  funcionSemanas: number;
  cognicionSemanas: number;
} {
  const { totalMinutes, totalWeeks, ePercentage, fPercentage, cPercentage } = input;

  if (totalMinutes < 0) {
    throw new Error(`totalMinutes must be non-negative, received: ${totalMinutes}`);
  }
  if (totalWeeks < 0) {
    throw new Error(`totalWeeks must be non-negative, received: ${totalWeeks}`);
  }
  if (ePercentage < 0 || fPercentage < 0 || cPercentage < 0) {
    throw new Error(
      `EFC percentages must be non-negative (got E=${ePercentage}, F=${fPercentage}, C=${cPercentage})`,
    );
  }

  const sum = ePercentage + fPercentage + cPercentage;
  if (Math.abs(sum - 100) > 0.001) {
    throw new Error(
      `EFC percentages must sum to exactly 100 (got E=${ePercentage} + F=${fPercentage} + C=${cPercentage} = ${sum})`,
    );
  }

  const eRatio = ePercentage / 100;
  const fRatio = fPercentage / 100;
  const cRatio = cPercentage / 100;

  return {
    estructuraMinutes: round1(totalMinutes * eRatio),
    funcionMinutes:    round1(totalMinutes * fRatio),
    cognicionMinutes:  round1(totalMinutes * cRatio),
    estructuraSemanas: round1(totalWeeks * eRatio),
    funcionSemanas:    round1(totalWeeks * fRatio),
    cognicionSemanas:  round1(totalWeeks * cRatio),
  };
}

// ─── F-03: Microcycle type distribution ───────────────────────────────────────

/**
 * F-03 — Distribución de Tipos de Microciclo
 *
 * Fixed distribution ratios:
 * - Ajuste       = 10%
 * - Carga        = 40%
 * - Impacto      = 20%
 * - Activación   =  8%
 * - Competencia  = 12%
 * - Recuperación = 10%
 * Sum = 100% ✓
 *
 * @throws {Error} When totalWeeks is negative.
 */
export function computeMicrocycleTypeDistribution(totalWeeks: number): {
  ajuste: number;
  carga: number;
  impacto: number;
  activacion: number;
  competencia: number;
  recuperacion: number;
} {
  if (totalWeeks < 0) {
    throw new Error(`totalWeeks must be non-negative, received: ${totalWeeks}`);
  }

  return {
    ajuste:       round1(totalWeeks * 0.10),
    carga:        round1(totalWeeks * 0.40),
    impacto:      round1(totalWeeks * 0.20),
    activacion:   round1(totalWeeks * 0.08),
    competencia:  round1(totalWeeks * 0.12),
    recuperacion: round1(totalWeeks * 0.10),
  };
}

// ─── F-04: Estructura internal subdistributions ───────────────────────────────

/**
 * F-04 — Subdistribuciones Internas por Etapa E (Estructura)
 *
 * Breaks down estructuraMinutes into all nested content blocks.
 * Top-level blocks:
 *   - Adaptación Anatómica   = 10%
 *   - Capacidades Cond.      = 20%
 *   - Capacidades Coord.     = 20%
 *   - Técnica                = 30%
 *   - Táctica Simple         = 20%
 *
 * @throws {Error} When estructuraMinutes is negative.
 */
export function computeEstructuraSubdistribution(
  estructuraMinutes: number,
): EstructuraSubdistribution {
  if (estructuraMinutes < 0) {
    throw new Error(
      `estructuraMinutes must be non-negative, received: ${estructuraMinutes}`,
    );
  }

  // ── Top-level blocks ────────────────────────────────────────────────────────
  const adaptAnatomica = round1(estructuraMinutes * 0.10);
  const condicional    = round1(estructuraMinutes * 0.20);
  const coordinativo   = round1(estructuraMinutes * 0.20);
  const tecnico        = round1(estructuraMinutes * 0.30);
  const tacticoSimple  = round1(estructuraMinutes * 0.20);

  // ── Adaptación Anatómica sub-blocks ─────────────────────────────────────────
  const adaptAnatomicaEstable    = round1(adaptAnatomica * 0.50);
  const adaptAnatomicaInestable  = round1(adaptAnatomica * 0.50);

  // ── Condicionales sub-blocks ─────────────────────────────────────────────────
  const condicionalFuerza       = round1(condicional * 0.40);
  const condicionalVelocidad    = round1(condicional * 0.30);
  const condicionalResistencia  = round1(condicional * 0.20);
  const condicionalFlexibilidad = round1(condicional * 0.10);

  // ── Coordinativas sub-blocks ─────────────────────────────────────────────────
  const coordinativoDiferenciacion = round1(coordinativo * 0.10);
  const coordinativoAcoplamiento   = round1(coordinativo * 0.10);
  const coordinativoOrientacion    = round1(coordinativo * 0.20);
  const coordinativoEquilibrio     = round1(coordinativo * 0.20);
  const coordinativoCambio         = round1(coordinativo * 0.10);
  const coordinativoRitmica        = round1(coordinativo * 0.10);
  const coordinativoRelajacion     = round1(coordinativo * 0.20);

  // ── Técnica sub-blocks ───────────────────────────────────────────────────────
  const tecnicoPatadas       = round1(tecnico * 0.50);
  const tecnicoPunos         = round1(tecnico * 0.10);
  const tecnicoBloqueos      = round1(tecnico * 0.20);
  const tecnicoDesplazamiento = round1(tecnico * 0.20);

  // ── Táctica Simple sub-blocks ────────────────────────────────────────────────
  const tacticoAprendizaje   = round1(tacticoSimple * 0.50);
  const tacticoMecanizacion  = round1(tacticoSimple * 0.40);
  const tacticoAutomatizacion = round1(tacticoSimple * 0.10);

  return {
    adaptAnatomica,
    condicional,
    coordinativo,
    tecnico,
    tacticoSimple,

    adaptAnatomicaEstable,
    adaptAnatomicaInestable,

    condicionalFuerza,
    condicionalVelocidad,
    condicionalResistencia,
    condicionalFlexibilidad,

    coordinativoDiferenciacion,
    coordinativoAcoplamiento,
    coordinativoOrientacion,
    coordinativoEquilibrio,
    coordinativoCambio,
    coordinativoRitmica,
    coordinativoRelajacion,

    tecnicoPatadas,
    tecnicoPunos,
    tecnicoBloqueos,
    tecnicoDesplazamiento,

    tacticoAprendizaje,
    tacticoMecanizacion,
    tacticoAutomatizacion,
  };
}

// ─── F-05: Función internal subdistributions ──────────────────────────────────

/**
 * F-05 — Subdistribuciones Internas por Etapa F (Función)
 *
 * Top-level blocks:
 *   - Capacidades Cond.   = 30%
 *   - Capacidades Coord.  = 15%
 *   - Técnica             = 10%
 *   - Táctica Simple      = 30%
 *   - Táctica Compleja    = 15%
 *
 * @throws {Error} When funcionMinutes is negative.
 */
export function computeFuncionSubdistribution(
  funcionMinutes: number,
): FuncionSubdistribution {
  if (funcionMinutes < 0) {
    throw new Error(
      `funcionMinutes must be non-negative, received: ${funcionMinutes}`,
    );
  }

  // ── Top-level blocks ────────────────────────────────────────────────────────
  const condicional     = round1(funcionMinutes * 0.30);
  const coordinativo    = round1(funcionMinutes * 0.15);
  const tecnico         = round1(funcionMinutes * 0.10);
  const tacticoSimple   = round1(funcionMinutes * 0.30);
  const tacticoComplejo = round1(funcionMinutes * 0.15);

  // ── Condicionales sub-blocks ─────────────────────────────────────────────────
  const condicionalFuerza       = round1(condicional * 0.30);
  const condicionalResistencia  = round1(condicional * 0.30);
  const condicionalVelocidad    = round1(condicional * 0.30);
  const condicionalFlexibilidad = round1(condicional * 0.10);

  // ── Coordinativas sub-blocks ─────────────────────────────────────────────────
  const coordinativoDiferenciacion = round1(coordinativo * 0.10);
  const coordinativoAcoplamiento   = round1(coordinativo * 0.10);
  const coordinativoOrientacion    = round1(coordinativo * 0.20);
  const coordinativoEquilibrio     = round1(coordinativo * 0.20);
  const coordinativoCambio         = round1(coordinativo * 0.10);
  const coordinativoRitmica        = round1(coordinativo * 0.10);
  const coordinativoRelajacion     = round1(coordinativo * 0.20);

  // ── Técnica sub-blocks ───────────────────────────────────────────────────────
  const tecnicoPatadas        = round1(tecnico * 0.50);
  const tecnicoPunos          = round1(tecnico * 0.10);
  const tecnicoBloqueos       = round1(tecnico * 0.20);
  const tecnicoDesplazamiento = round1(tecnico * 0.20);

  // ── Táctica Simple sub-blocks ────────────────────────────────────────────────
  const tacticoSimpleAprendizaje    = round1(tacticoSimple * 0.10);
  const tacticoSimpleMecanizacion   = round1(tacticoSimple * 0.50);
  const tacticoSimpleAutomatizacion = round1(tacticoSimple * 0.40);

  // ── Táctica Compleja sub-blocks ───────────────────────────────────────────────
  const tacticoComplejoDecision3 = round1(tacticoComplejo * 0.60);
  const tacticoComplejoDecision5 = round1(tacticoComplejo * 0.40);

  return {
    condicional,
    coordinativo,
    tecnico,
    tacticoSimple,
    tacticoComplejo,

    condicionalFuerza,
    condicionalResistencia,
    condicionalVelocidad,
    condicionalFlexibilidad,

    coordinativoDiferenciacion,
    coordinativoAcoplamiento,
    coordinativoOrientacion,
    coordinativoEquilibrio,
    coordinativoCambio,
    coordinativoRitmica,
    coordinativoRelajacion,

    tecnicoPatadas,
    tecnicoPunos,
    tecnicoBloqueos,
    tecnicoDesplazamiento,

    tacticoSimpleAprendizaje,
    tacticoSimpleMecanizacion,
    tacticoSimpleAutomatizacion,

    tacticoComplejoDecision3,
    tacticoComplejoDecision5,
  };
}

// ─── F-06: Cognición internal subdistributions ───────────────────────────────

/**
 * F-06 — Subdistribuciones Internas por Etapa C (Cognición)
 *
 * Top-level blocks:
 *   - Capacidades Cond.   = 28%
 *   - Capacidades Coord.  = 18%
 *   - Táctica Compleja    = 54%
 *
 * @throws {Error} When cognicionMinutes is negative.
 */
export function computeCognicionSubdistribution(
  cognicionMinutes: number,
): CognicionSubdistribution {
  if (cognicionMinutes < 0) {
    throw new Error(
      `cognicionMinutes must be non-negative, received: ${cognicionMinutes}`,
    );
  }

  // ── Top-level blocks ────────────────────────────────────────────────────────
  const condicional     = round1(cognicionMinutes * 0.28);
  const coordinativo    = round1(cognicionMinutes * 0.18);
  const tacticoComplejo = round1(cognicionMinutes * 0.54);

  // ── Condicionales sub-blocks ─────────────────────────────────────────────────
  const condicionalFuerza       = round1(condicional * 0.40);
  const condicionalResistencia  = round1(condicional * 0.20);
  const condicionalVelocidad    = round1(condicional * 0.30);
  const condicionalFlexibilidad = round1(condicional * 0.10);

  // ── Coordinativas sub-blocks ─────────────────────────────────────────────────
  const coordinativoDiferenciacion = round1(coordinativo * 0.10);
  const coordinativoAcoplamiento   = round1(coordinativo * 0.10);
  const coordinativoOrientacion    = round1(coordinativo * 0.30);
  const coordinativoEquilibrio     = round1(coordinativo * 0.20);
  const coordinativoCambio         = round1(coordinativo * 0.05);
  const coordinativoRitmica        = round1(coordinativo * 0.05);
  const coordinativoRelajacion     = round1(coordinativo * 0.20);

  // ── Táctica Compleja sub-blocks ───────────────────────────────────────────────
  const tacticoComplejoDecision3 = round1(tacticoComplejo * 0.30);
  const tacticoComplejoDecision5 = round1(tacticoComplejo * 0.70);

  return {
    condicional,
    coordinativo,
    tacticoComplejo,

    condicionalFuerza,
    condicionalResistencia,
    condicionalVelocidad,
    condicionalFlexibilidad,

    coordinativoDiferenciacion,
    coordinativoAcoplamiento,
    coordinativoOrientacion,
    coordinativoEquilibrio,
    coordinativoCambio,
    coordinativoRitmica,
    coordinativoRelajacion,

    tacticoComplejoDecision3,
    tacticoComplejoDecision5,
  };
}

// ─── Combined: computeFullMacrocycleDistribution ──────────────────────────────

/**
 * Convenience function that composes F-01 through F-06 in a single call.
 *
 * Returns a {@link MacrocycleDistribution} (compatible with the computed-metrics
 * type) extended with per-stage internal subdistributions.
 *
 * @throws All errors that individual formula functions throw.
 */
export function computeFullMacrocycleDistribution(input: {
  startDate: string;
  competitionDate: string;
  hoursPerSession: number;
  trainingDaysPerWeek: number;
  sessionsPerDay: number;
  /** Percentage for Estructura stage (0–100, default 50). */
  ePercentage: number;
  /** Percentage for Función stage (0–100, default 30). */
  fPercentage: number;
  /** Percentage for Cognición stage (0–100, default 20). */
  cPercentage: number;
}): MacrocycleDistribution & {
  subdistributions: {
    e: EstructuraSubdistribution;
    f: FuncionSubdistribution;
    c: CognicionSubdistribution;
  };
} {
  // F-01
  const volume = computeMacrocycleVolume(input);

  // F-02
  const efc = computeEfcDistribution({
    totalMinutes: volume.totalMinutes,
    totalWeeks:   volume.totalWeeks,
    ePercentage:  input.ePercentage,
    fPercentage:  input.fPercentage,
    cPercentage:  input.cPercentage,
  });

  // F-03
  const tiposMicrociclo = computeMicrocycleTypeDistribution(volume.totalWeeks);

  // F-04, F-05, F-06
  const subdistributions = {
    e: computeEstructuraSubdistribution(efc.estructuraMinutes),
    f: computeFuncionSubdistribution(efc.funcionMinutes),
    c: computeCognicionSubdistribution(efc.cognicionMinutes),
  };

  return {
    // F-01 fields
    totalDays:    volume.totalDays,
    totalWeeks:   volume.totalWeeks,
    totalMinutes: volume.totalMinutes,
    totalHours:   volume.totalHours,

    // F-02 fields
    estructuraMinutes: efc.estructuraMinutes,
    funcionMinutes:    efc.funcionMinutes,
    cognicionMinutes:  efc.cognicionMinutes,
    estructuraSemanas: efc.estructuraSemanas,
    funcionSemanas:    efc.funcionSemanas,
    cognicionSemanas:  efc.cognicionSemanas,

    // F-03 fields
    tiposMicrociclo,

    // F-04..F-06 subdistributions
    subdistributions,
  };
}
