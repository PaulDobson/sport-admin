import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { ScheduleRepositoryPort } from "../ports/schedule-repository-port";

export const disciplineSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(1, "Escribe el nombre de la disciplina."),
});

export async function createDiscipline(
  input: z.input<typeof disciplineSchema>,
  deps: { schedules: Pick<ScheduleRepositoryPort, "createDiscipline"> },
) {
  return deps.schedules.createDiscipline(parseWithSchema(disciplineSchema, input));
}
