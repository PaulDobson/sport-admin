import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { MetricRepositoryPort } from "../ports/metric-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
  definitionId: z.string().uuid(),
});

export async function archiveMetricDefinition(
  input: z.input<typeof schema>,
  deps: { metrics: MetricRepositoryPort },
) {
  const parsed = parseWithSchema(schema, input);
  await deps.metrics.archiveDefinition(parsed.tenantId, parsed.definitionId);
}
