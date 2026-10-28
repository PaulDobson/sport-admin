import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { MetricRepositoryPort } from "../ports/metric-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
});

export async function listMetricDefinitions(
  input: z.input<typeof schema>,
  deps: { metrics: MetricRepositoryPort },
) {
  const parsed = parseWithSchema(schema, input);
  return deps.metrics.listAllActiveDefinitions(parsed.tenantId);
}

export async function ensureDefaultMetricDefinitions(
  input: z.input<typeof schema>,
  deps: { metrics: MetricRepositoryPort },
) {
  const parsed = parseWithSchema(schema, input);
  const existing = await deps.metrics.listAllActiveDefinitions(parsed.tenantId);
  if (existing.length === 0) {
    await deps.metrics.seedDefaultDefinitions(parsed.tenantId);
    return deps.metrics.listAllActiveDefinitions(parsed.tenantId);
  }
  return existing;
}
