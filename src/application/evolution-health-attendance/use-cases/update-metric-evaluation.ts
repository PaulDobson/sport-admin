import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import { ValidationError } from "@/domain/shared/errors";
import { metricValueError } from "@/domain/evolution-health-attendance/metric";
import type { MetricRepositoryPort } from "../ports/metric-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
  evaluationId: z.string().uuid(),
  evaluatedAt: z.coerce.date(),
  values: z
    .record(z.string().min(1), z.unknown())
    .refine(
      (values) => Object.keys(values).length > 0,
      "At least one metric value is required",
    ),
  notes: z.string().trim().optional(),
});

export async function updateMetricEvaluation(
  input: z.input<typeof schema>,
  deps: { metrics: MetricRepositoryPort },
) {
  const parsed = parseWithSchema(schema, input);
  const slugs = Object.keys(parsed.values);
  const definitions = await deps.metrics.findActiveDefinitions(
    // tenantId is needed for definition lookup — pass via values key scope
    parsed.tenantId,
    slugs,
  );
  const definitionsBySlug = new Map(definitions.map((d) => [d.slug, d]));

  const issues = slugs.flatMap((slug) => {
    const definition = definitionsBySlug.get(slug);
    if (!definition) {
      return [{ path: `values.${slug}`, message: "Active metric definition not found" }];
    }
    const message = metricValueError(definition, parsed.values[slug]);
    return message ? [{ path: `values.${slug}`, message }] : [];
  });

  if (issues.length > 0) throw new ValidationError(issues);
  return deps.metrics.updateEvaluation(parsed);
}
