import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { ScheduleRepositoryPort } from "../ports/schedule-repository-port";
import type { ScheduleCatalogPort } from "../ports/schedule-catalog-port";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { classTemplateFieldsSchema } from "./manage-class-templates";

const schema = z.object({
  tenantId: z.string().uuid(),
  disciplineId: z.string().uuid("Selecciona una disciplina válida."),
  ...classTemplateFieldsSchema.shape,
});

export async function createClassTemplate(
  input: z.input<typeof schema>,
  deps: {
    schedules: ScheduleRepositoryPort;
    catalog: Pick<ScheduleCatalogPort, "findActiveDiscipline">;
  },
) {
  const parsed = parseWithSchema(schema, input);
  const discipline = await deps.catalog.findActiveDiscipline(
    parsed.tenantId,
    parsed.disciplineId,
  );
  if (!discipline) {
    throw new BusinessRuleViolationError(
      "La disciplina seleccionada ya no está activa o no pertenece a tu academia. Actualiza el catálogo y selecciona otra.",
    );
  }
  return deps.schedules.createClassTemplate(parsed);
}
