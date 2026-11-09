import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { MetricRepositoryPort } from "../ports/metric-repository-port";

const evaluationTypeSchema = z.enum([
  "body_composition",
  "strength",
  "cardio",
  "custom",
]);

const rangeRulesSchema = z
  .object({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .refine(
    (rules) =>
      rules.min === undefined ||
      rules.max === undefined ||
      rules.min <= rules.max,
    "Minimum cannot exceed maximum",
  );

const schema = z.object({
  tenantId: z.string().uuid(),
  definitionId: z.string().uuid(),
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  evaluationType: evaluationTypeSchema.default("custom"),
  unit: z.string().trim().min(1).optional(),
  validationRules: rangeRulesSchema.default({}),
  timeWindowSeconds: z.number().int().positive().optional(),
});

export async function updateMetricDefinition(
  input: z.input<typeof schema>,
  deps: { metrics: MetricRepositoryPort },
) {
  return deps.metrics.updateDefinition(parseWithSchema(schema, input));
}
