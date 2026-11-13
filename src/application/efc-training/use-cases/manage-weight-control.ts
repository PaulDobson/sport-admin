import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import { computeWeightCutMetrics } from "@/domain/efc-training";
import type { WeightControlRepositoryPort } from "../ports";

// ─── Schema ───────────────────────────────────────────────────────────────────

const saveWeightSchema = z.object({
  athleteId: z.string().uuid(),
  tenantId: z.string().uuid(),
  recordDate: z.iso.date(),
  weightKg: z.number().min(30).max(200),
  categoryName: z.string().min(1).max(50),
  categoryLimitKg: z.number().min(20).max(150),
});

export type SaveWeightControlInput = z.input<typeof saveWeightSchema>;

// ─── Use cases ────────────────────────────────────────────────────────────────

export async function saveWeightControl(
  input: SaveWeightControlInput,
  deps: { weightControl: WeightControlRepositoryPort },
) {
  return deps.weightControl.save(parseWithSchema(saveWeightSchema, input));
}

export async function getWeightControlData(
  athleteId: string,
  tenantId: string,
  limit: number = 90,
  deps: { weightControl: WeightControlRepositoryPort },
) {
  const [records, baseline] = await Promise.all([
    deps.weightControl.findByAthleteId(athleteId, tenantId, limit),
    deps.weightControl.findBaselineByAthleteId(athleteId, tenantId),
  ]);

  if (!records.length || !baseline) {
    return { records, metrics: null };
  }

  const latest = records[0]; // most recent first
  const daysSinceBaseline = Math.round(
    (new Date(latest.recordDate).getTime() -
      new Date(baseline.recordDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const metrics = computeWeightCutMetrics({
    weightCurrent: latest.weightKg,
    weightBaseline: baseline.weightKg,
    categoryLimitKg: latest.categoryLimitKg,
    daysSinceBaseline,
  });

  return { records, metrics };
}
