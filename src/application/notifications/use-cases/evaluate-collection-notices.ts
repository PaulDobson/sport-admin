import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { CollectionNoticeEvaluatorPort } from "../ports/collection-notice-evaluator-port";

const schema = z.object({
  referenceDate: z.iso.date(),
  renewalWindowDays: z.number().int().min(0).max(90).default(7),
});

export function evaluateCollectionNotices(
  input: z.input<typeof schema>,
  deps: { collectionNotices: CollectionNoticeEvaluatorPort },
) {
  return deps.collectionNotices.evaluate(parseWithSchema(schema, input));
}
