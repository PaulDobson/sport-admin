import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import { programmingSchema, type ProgrammingBatchPort } from "../ports/programming-batch-port";

const batchSchema = z.object({
  tenantId: z.string().uuid(),
  instructorMembershipId: z.string().uuid(),
  programming: programmingSchema,
  intent: z.enum(["save", "publish"]),
  commit: z.boolean(),
  previewFingerprint: z.string().optional(),
}).refine((input) => input.intent !== "save" || input.programming.mode === "weekly", {
  message: "Solo los horarios semanales se pueden guardar sin publicar.",
}).refine((input) => !input.commit || Boolean(input.previewFingerprint), {
  message: "Revisa la programación antes de confirmar.",
});

export async function executeProgrammingBatch(
  input: z.input<typeof batchSchema>,
  deps: { programming: ProgrammingBatchPort },
) {
  return deps.programming.execute(parseWithSchema(batchSchema, input));
}
