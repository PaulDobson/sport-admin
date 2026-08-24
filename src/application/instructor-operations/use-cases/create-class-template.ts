import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { ScheduleRepositoryPort } from "../ports/schedule-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
  disciplineId: z.string().uuid(),
  name: z.string().trim().min(1, "Class name is required"),
  capacity: z.number().int().positive(),
});

export async function createClassTemplate(
  input: z.input<typeof schema>,
  deps: { schedules: ScheduleRepositoryPort },
) {
  return deps.schedules.createClassTemplate(parseWithSchema(schema, input));
}
