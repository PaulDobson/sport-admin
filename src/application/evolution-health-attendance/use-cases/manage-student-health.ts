import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { HealthRepositoryPort } from "../ports/health-repository-port";

const idFields = {
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
};
const optionalDate = z.string().date().optional();

const conditionSchema = z.object({
  ...idFields,
  name: z.string().trim().min(1),
  source: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  startedOn: optionalDate,
});

const injurySchema = z.object({
  ...idFields,
  name: z.string().trim().min(1),
  bodyArea: z.string().trim().optional(),
  painLevel: z.number().int().min(0).max(10).optional(),
  source: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  occurredOn: optionalDate,
});

const restrictionSchema = z
  .object({
    ...idFields,
    conditionId: z.string().uuid().optional(),
    injuryId: z.string().uuid().optional(),
    description: z.string().trim().min(1),
    operationalAction: z.string().trim().min(1),
    severity: z.enum(["red", "yellow", "green"]),
    source: z.string().trim().min(1),
    startsOn: z.string().date(),
    endsOn: optionalDate,
  })
  .refine((input) => !(input.conditionId && input.injuryId), {
    message: "Restriction cannot reference both a condition and an injury",
  })
  .refine((input) => !input.endsOn || input.endsOn >= input.startsOn, {
    message: "Restriction end cannot precede its start",
  });

const recordSchema = z.object({
  tenantId: z.string().uuid(),
  recordId: z.string().uuid(),
});
const historySchema = z.object(idFields);

export async function createHealthCondition(
  input: z.input<typeof conditionSchema>,
  deps: { health: HealthRepositoryPort },
) {
  return deps.health.createCondition(parseWithSchema(conditionSchema, input));
}

export async function updateHealthCondition(
  input: z.input<typeof recordSchema> & { notes?: string; source?: string },
  deps: { health: HealthRepositoryPort },
) {
  const parsed = parseWithSchema(
    recordSchema.extend({
      notes: z.string().trim().optional(),
      source: z.string().trim().min(1).optional(),
    }),
    input,
  );
  return deps.health.updateCondition(parsed.tenantId, parsed.recordId, {
    notes: parsed.notes,
    source: parsed.source,
  });
}

export async function resolveHealthCondition(
  input: z.input<typeof recordSchema> & { resolvedAt?: Date | string },
  deps: { health: HealthRepositoryPort },
) {
  const parsed = parseWithSchema(
    recordSchema.extend({
      resolvedAt: z.coerce.date().default(() => new Date()),
    }),
    input,
  );
  return deps.health.resolveCondition(
    parsed.tenantId,
    parsed.recordId,
    parsed.resolvedAt,
  );
}

export async function createInjury(
  input: z.input<typeof injurySchema>,
  deps: { health: HealthRepositoryPort },
) {
  return deps.health.createInjury(parseWithSchema(injurySchema, input));
}

export async function updateInjury(
  input: z.input<typeof recordSchema> & { painLevel?: number; notes?: string },
  deps: { health: HealthRepositoryPort },
) {
  const parsed = parseWithSchema(
    recordSchema.extend({
      painLevel: z.number().int().min(0).max(10).optional(),
      notes: z.string().trim().optional(),
    }),
    input,
  );
  return deps.health.updateInjury(parsed.tenantId, parsed.recordId, {
    painLevel: parsed.painLevel,
    notes: parsed.notes,
  });
}

export async function resolveInjury(
  input: z.input<typeof recordSchema> & { resolvedAt?: Date | string },
  deps: { health: HealthRepositoryPort },
) {
  const parsed = parseWithSchema(
    recordSchema.extend({
      resolvedAt: z.coerce.date().default(() => new Date()),
    }),
    input,
  );
  return deps.health.resolveInjury(
    parsed.tenantId,
    parsed.recordId,
    parsed.resolvedAt,
  );
}

export async function createHealthRestriction(
  input: z.input<typeof restrictionSchema>,
  deps: { health: HealthRepositoryPort },
) {
  return deps.health.createRestriction(
    parseWithSchema(restrictionSchema, input),
  );
}

export async function resolveHealthRestriction(
  input: z.input<typeof recordSchema> & { resolvedAt?: Date | string },
  deps: { health: HealthRepositoryPort },
) {
  const parsed = parseWithSchema(
    recordSchema.extend({
      resolvedAt: z.coerce.date().default(() => new Date()),
    }),
    input,
  );
  return deps.health.resolveRestriction(
    parsed.tenantId,
    parsed.recordId,
    parsed.resolvedAt,
  );
}

export async function getStudentHealthHistory(
  input: z.input<typeof historySchema>,
  deps: { health: HealthRepositoryPort },
) {
  const parsed = parseWithSchema(historySchema, input);
  await deps.health.recordAccess(
    parsed.tenantId,
    parsed.studentId,
    "student_health_history",
    parsed.studentId,
  );
  return deps.health.listHistory(parsed.tenantId, parsed.studentId);
}
