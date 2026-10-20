import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { ClassTemplateAdministrationPort } from "../ports/class-template-administration-port";

export const classTemplateFieldsSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de la clase.").max(100, "El nombre debe tener como máximo 100 caracteres."),
  capacity: z.number().int("La capacidad debe ser un número entero.").min(1, "La capacidad debe ser al menos 1.").max(500, "La capacidad no puede superar los 500 cupos."),
});

const identitySchema = z.object({
  tenantId: z.string().uuid(),
  id: z.string().uuid("Selecciona una clase válida."),
});
const updateSchema = identitySchema.extend(classTemplateFieldsSchema.shape);

export async function updateClassTemplate(
  input: z.input<typeof updateSchema>,
  deps: { classes: Pick<ClassTemplateAdministrationPort, "update"> },
) {
  return deps.classes.update(parseWithSchema(updateSchema, input));
}

export async function deleteClassTemplate(
  input: z.input<typeof identitySchema>,
  deps: { classes: Pick<ClassTemplateAdministrationPort, "delete"> },
) {
  return deps.classes.delete(parseWithSchema(identitySchema, input));
}
