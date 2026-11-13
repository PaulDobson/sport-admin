import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type {
  MicrocycleRepositoryPort,
  MacrocycleRepositoryPort,
} from "../ports";

// ─── Schema ───────────────────────────────────────────────────────────────────

const sessionLoadSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  category: z.string().min(1).max(100),
  subcategory: z.string().min(1).max(100),
  minutes: z.number().int().min(0).max(480),
  notes: z.string().max(500).nullable().default(null),
  tenantId: z.string().uuid(),
});

const saveMicrocycleSchema = z.object({
  macrocycleId: z.string().uuid(),
  weekNumber: z.number().int().min(1).max(52),
  microcycleType: z.enum(["AJ", "C", "I", "AC", "CO", "R"]),
  intensityTarget: z.number().int().min(0).max(9),
  objective: z.string().max(500).default(""),
  loads: z.array(sessionLoadSchema).default([]),
});

export type SaveMicrocycleInput = z.input<typeof saveMicrocycleSchema>;

const saveSrpeSchema = z.object({
  microcycleId: z.string().uuid(),
  athleteId: z.string().uuid(),
  tenantId: z.string().uuid(),
  dayOfWeek: z.number().int().min(1).max(7),
  rpe: z.number().int().min(1).max(10),
  durationMinutes: z.number().int().min(1).max(480),
});

export type SaveSrpeInput = z.input<typeof saveSrpeSchema>;

// ─── Use cases ────────────────────────────────────────────────────────────────

export async function saveMicrocycle(
  input: SaveMicrocycleInput,
  deps: {
    microcycles: MicrocycleRepositoryPort;
    macrocycles: MacrocycleRepositoryPort;
  },
) {
  const data = parseWithSchema(saveMicrocycleSchema, input);
  const { loads, ...microcycleData } = data;

  // Check for duplicate week
  const existing = await deps.microcycles.findByWeekNumber(
    data.macrocycleId,
    data.weekNumber,
  );
  if (existing) {
    throw new Error(
      `Ya existe un microciclo para la semana ${data.weekNumber} en este macrociclo`,
    );
  }

  const saved = await deps.microcycles.save(microcycleData as Parameters<typeof deps.microcycles.save>[0]);

  // Replace loads if provided
  if (loads.length > 0) {
    await deps.microcycles.replaceLoads(
      saved.id,
      loads[0].tenantId,
      loads.map((l) => ({ ...l, microcycleId: saved.id })),
    );
  }

  return saved;
}

export async function updateMicrocycleLoads(
  microcycleId: string,
  tenantId: string,
  loads: SaveMicrocycleInput["loads"],
  deps: { microcycles: MicrocycleRepositoryPort },
) {
  const parsed = parseWithSchema(z.array(sessionLoadSchema), loads ?? []);
  return deps.microcycles.replaceLoads(
    microcycleId,
    tenantId,
    parsed.map((l) => ({ ...l, microcycleId })),
  );
}

export async function saveSrpe(
  input: SaveSrpeInput,
  deps: { microcycles: MicrocycleRepositoryPort },
) {
  return deps.microcycles.upsertSrpe(parseWithSchema(saveSrpeSchema, input));
}

export async function getMicrocyclesByMacrocycle(
  macrocycleId: string,
  deps: { microcycles: MicrocycleRepositoryPort },
) {
  return deps.microcycles.findByMacrocycleId(macrocycleId);
}
