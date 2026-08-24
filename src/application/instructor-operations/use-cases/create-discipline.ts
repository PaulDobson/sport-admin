import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { ScheduleRepositoryPort } from "../ports/schedule-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(1, "Discipline name is required"),
});

export async function createDiscipline(
  input: z.input<typeof schema>,
  deps: { schedules: ScheduleRepositoryPort },
) {
  return deps.schedules.createDiscipline(parseWithSchema(schema, input));
}
