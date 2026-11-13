/**
 * Domain: EFC Training
 *
 * Core entity types for the EFC periodisation model:
 *   - EfcMacrocycle  — a full training plan from start date to competition
 *   - EfcMicrocycle  — a single weekly block within a macrocycle
 *   - SessionLoad    — a planned training load entry for a given day
 *   - SessionSrpe    — an athlete's session-RPE response for a given day
 *
 * All date fields are ISO 8601 date strings (YYYY-MM-DD or full ISO timestamp).
 */

import type { EfcPeriod, MicrocycleType, IntensityScale } from './shared';

// ─── Macrocycle ───────────────────────────────────────────────────────────────

/**
 * A full EFC periodisation macrocycle.
 * EFC period percentages (ePercentage, fPercentage, cPercentage) must sum to 100.
 */
export interface EfcMacrocycle {
  id: string;
  athleteId: string;
  tenantId: string;
  /** ISO date string — first day of the macrocycle. */
  startDate: string;
  /** ISO date string — target competition date. */
  competitionDate: string;
  /** Planned session duration in hours (0.5–8.0). */
  hoursPerSession: number;
  /** Number of training days per week (1–7). */
  trainingDaysPerWeek: number;
  /** Number of sessions per training day (1–5). */
  sessionsPerDay: number;
  /** Percentage of total time allocated to Estructura period (0–100, default 50). */
  ePercentage: number;
  /** Percentage of total time allocated to Función period (0–100, default 30). */
  fPercentage: number;
  /** Percentage of total time allocated to Cognición period (0–100, default 20). */
  cPercentage: number;
  /** Optional free-text rationale for the macrocycle design. */
  justification: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Microcycle ───────────────────────────────────────────────────────────────

/** A single weekly training block within a macrocycle. */
export interface EfcMicrocycle {
  id: string;
  macrocycleId: string;
  /** Sequential week number within the macrocycle (1–52). */
  weekNumber: number;
  microcycleType: MicrocycleType;
  intensityTarget: IntensityScale;
  /** Short description of the week's training objective. */
  objective: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Session load ─────────────────────────────────────────────────────────────

/** A planned load entry for a specific day and training category within a microcycle. */
export interface SessionLoad {
  id: string;
  microcycleId: string;
  tenantId: string;
  /** Day of week: 1 = Monday … 7 = Sunday. */
  dayOfWeek: number;
  category: string;
  subcategory: string;
  /** Planned duration in minutes (0–480). */
  minutes: number;
  notes: string | null;
  createdAt: string;
}

// ─── Session sRPE ─────────────────────────────────────────────────────────────

/** An athlete's session Rating of Perceived Exertion (sRPE) entry for a training day. */
export interface SessionSrpe {
  id: string;
  microcycleId: string;
  athleteId: string;
  tenantId: string;
  /** Day of week: 1 = Monday … 7 = Sunday. */
  dayOfWeek: number;
  /** Raw RPE value on a 1–10 scale. */
  rpe: number;
  /** Session duration in minutes (1–480). */
  durationMinutes: number;
  /** Computed training load: rpe × durationMinutes. */
  srpe: number;
  createdAt: string;
}

// ─── Load categories ──────────────────────────────────────────────────────────

/**
 * All five training load categories, each with a display label and their
 * ordered list of subcategories.
 *
 * Used to populate load entry forms and validate incoming category/subcategory pairs.
 */
export const LOAD_CATEGORIES = {
  cardiovascular: {
    label: 'Cardiovascular',
    subcategories: [
      'Cap. Aeróbica',
      'Cap. Anaeróbica',
      'Pot. Aeróbica',
      'Pot. Anaeróbica',
      'Aláctico',
      'Regenerativo',
    ],
  },
  condicionales: {
    label: 'Capacidades Condicionales',
    subcategories: [
      'Flexibilidad FNP',
      'Flexibilidad Balística',
      'Flexibilidad Pasiva',
      'Fuerza Máxima',
      'Fuerza Resistencia',
      'Fuerza Rápida',
      'Rest. Fuerza Veloz',
      'Veloc. Desplaz.',
      'Rest. a la Velocidad',
      'Veloc. Frecuencial',
      'Veloc. Reacc. Mov.',
    ],
  },
  coordinativas: {
    label: 'Capacidades Coordinativas',
    subcategories: [
      'Cap. Acopl. Mov.',
      'Cap. Diferenciación',
      'Cap. Equilibrio',
      'Cap. Orientación',
      'Cap. Ritmo',
      'Cap. Reacción',
      'Cap. Adap. Variac.',
    ],
  },
  tecnico: {
    label: 'Técnico – Patadas',
    subcategories: [
      'TRASERA',
      'DELANTERA',
      'PUESTO',
      'C/SALTO',
      'C/APOYO',
      'GIRO',
      'COMBINADAS',
    ],
  },
  tactico: {
    label: 'Táctico',
    subcategories: [
      'Step Fuerza',
      'Step Elástico',
      'Step Reflejo',
      'Man. Ataq.',
      'Man. Def.',
      'Man. Anticipa.',
      'MAN. Combinadas',
      'COMBATE',
    ],
  },
} as const;

/** Union of valid load category keys. */
export type LoadCategoryKey = keyof typeof LOAD_CATEGORIES;
