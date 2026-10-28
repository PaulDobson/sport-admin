import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { MetricRepositoryPort } from "../ports/metric-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
  evaluationId: z.string().uuid(),
});

export async function deleteMetricEvaluation(
  input: z.input<typeof schema>,
  deps: { metrics: MetricRepositoryPort },
) {
  const parsed = parseWithSchema(schema, input);
  await deps.metrics.deleteEvaluation(parsed.tenantId, parsed.evaluationId);
}
