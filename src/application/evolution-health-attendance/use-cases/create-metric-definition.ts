import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { MetricRepositoryPort } from "../ports/metric-repository-port";

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

const baseFields = {
  tenantId: z.string().uuid(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  unit: z.string().trim().min(1).optional(),
};

const schema = z.discriminatedUnion("valueType", [
  z.object({
    ...baseFields,
    valueType: z.literal("numeric"),
    validationRules: rangeRulesSchema.default({}),
  }),
  z.object({
    ...baseFields,
    valueType: z.literal("percentage"),
    validationRules: rangeRulesSchema.default({}),
  }),
  z.object({
    ...baseFields,
    valueType: z.literal("duration"),
    validationRules: rangeRulesSchema.default({}),
  }),
  z.object({
    ...baseFields,
    valueType: z.literal("selection"),
    validationRules: z.object({
      options: z.array(z.string().trim().min(1)).min(1),
    }),
  }),
  z.object({
    ...baseFields,
    valueType: z.literal("object"),
    validationRules: z
      .object({ requiredFields: z.array(z.string().trim().min(1)).default([]) })
      .default({ requiredFields: [] }),
  }),
]);

export async function createMetricDefinition(
  input: z.input<typeof schema>,
  deps: { metrics: MetricRepositoryPort },
) {
  return deps.metrics.createDefinition(parseWithSchema(schema, input));
}
