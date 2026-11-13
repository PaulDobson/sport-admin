import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import {
  computeOneRm,
  buildOneRmPercentageTable,
  getEfcOneRmRecommendation,
  rpeToRir,
} from "@/domain/efc-training";
import type { OneRmRepositoryPort, AthleteProfileRepositoryPort } from "../ports";

// ─── Schema ───────────────────────────────────────────────────────────────────

const calculateOneRmSchema = z.object({
  weightKg: z.number().positive().max(999.9),
  repsPerformed: z.number().int().min(1).max(30),
  rir: z.number().int().min(0).max(5),
  rpe: z.number().min(6).max(10).nullable().optional(),
  exercise: z.enum(["squat", "bench_press", "deadlift", "other"]),
});

export type CalculateOneRmInput = z.input<typeof calculateOneRmSchema>;

const saveOneRmSchema = calculateOneRmSchema.extend({
  athleteId: z.string().uuid(),
  tenantId: z.string().uuid(),
  evaluationDate: z.iso.date(),
});

export type SaveOneRmInput = z.input<typeof saveOneRmSchema>;

// ─── Use cases ────────────────────────────────────────────────────────────────

/** Pure calculation — no persistence */
export function calculateOneRm(input: CalculateOneRmInput) {
  const data = parseWithSchema(calculateOneRmSchema, input);
  const rir = data.rpe != null ? rpeToRir(data.rpe) : data.rir;
  const result = computeOneRm({ ...data, rir });
  const table = buildOneRmPercentageTable(result.average);
  return { result, table };
}

/** Saves a 1RM record and returns enriched data with EFC recommendations */
export async function saveOneRm(
  input: SaveOneRmInput,
  deps: {
    oneRm: OneRmRepositoryPort;
    profiles: AthleteProfileRepositoryPort;
  },
) {
  const data = parseWithSchema(saveOneRmSchema, input);
  const rir = data.rpe != null ? rpeToRir(data.rpe) : data.rir;
  const { result } = calculateOneRm({ ...data, rir });

  const record = await deps.oneRm.save({
    athleteId: data.athleteId,
    tenantId: data.tenantId,
    exercise: data.exercise,
    evaluationDate: data.evaluationDate,
    weightKg: data.weightKg,
    repsPerformed: data.repsPerformed,
    rir,
    oneRmEpley: result.epley,
    oneRmBrzycki: result.brzycki ?? result.epley,
    oneRmAverage: result.average,
  });

  // Attach EFC recommendation if profile exists
  const profile = await deps.profiles.findByAthleteId(
    data.athleteId,
    data.tenantId,
  );
  const recommendation = profile
    ? getEfcOneRmRecommendation(profile.efcPeriod, result.average)
    : null;

  return { record, recommendation };
}

export async function listOneRmByAthlete(
  athleteId: string,
  tenantId: string,
  exercise: string | undefined,
  deps: { oneRm: OneRmRepositoryPort },
) {
  if (exercise) {
    return deps.oneRm.findByAthleteAndExercise(athleteId, tenantId, exercise);
  }
  return deps.oneRm.findByAthleteId(athleteId, tenantId);
}
