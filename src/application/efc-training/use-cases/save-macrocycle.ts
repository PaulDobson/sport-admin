import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import { computeFullMacrocycleDistribution } from "@/domain/efc-training";
import type {
  MacrocycleRepositoryPort,
  MicrocycleRepositoryPort,
} from "../ports";

// ─── Schema ───────────────────────────────────────────────────────────────────

const saveMacrocycleSchema = z.object({
  athleteId: z.string().uuid(),
  tenantId: z.string().uuid(),
  startDate: z.iso.date(),
  competitionDate: z.iso.date(),
  hoursPerSession: z.number().min(0.5).max(8.0),
  trainingDaysPerWeek: z.number().int().min(1).max(7),
  sessionsPerDay: z.number().int().min(1).max(5).default(1),
  ePercentage: z.number().int().min(0).max(100).default(50),
  fPercentage: z.number().int().min(0).max(100).default(30),
  cPercentage: z.number().int().min(0).max(100).default(20),
  justification: z.string().max(1000).nullable().default(null),
}).refine(
  (d) => d.ePercentage + d.fPercentage + d.cPercentage === 100,
  { message: "Los porcentajes E + F + C deben sumar 100" },
).refine(
  (d) => d.startDate < d.competitionDate,
  { message: "La fecha de competencia debe ser posterior a la fecha de inicio" },
);

export type SaveMacrocycleInput = z.input<typeof saveMacrocycleSchema>;

// ─── Use case ─────────────────────────────────────────────────────────────────

export async function saveMacrocycle(
  input: SaveMacrocycleInput,
  deps: { macrocycles: MacrocycleRepositoryPort },
) {
  const data = parseWithSchema(saveMacrocycleSchema, input);
  // Validate via domain formula (throws if < 10 weeks)
  computeFullMacrocycleDistribution(data);
  return deps.macrocycles.save(data);
}

export async function listMacrocyclesByAthlete(
  athleteId: string,
  tenantId: string,
  deps: { macrocycles: MacrocycleRepositoryPort },
) {
  return deps.macrocycles.findByAthleteId(athleteId, tenantId);
}

export async function getActiveMacrocycle(
  athleteId: string,
  tenantId: string,
  deps: { macrocycles: MacrocycleRepositoryPort },
) {
  return deps.macrocycles.findActiveByAthleteId(athleteId, tenantId);
}
