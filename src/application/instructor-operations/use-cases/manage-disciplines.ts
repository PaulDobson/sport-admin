import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { DisciplineAdministrationPort, DisciplineListInput } from "../ports/discipline-administration-port";
import { disciplineSchema } from "./create-discipline";

const identitySchema = disciplineSchema.pick({ tenantId: true }).extend({
  id: z.string().uuid("La disciplina no es válida."),
});
const updateSchema = disciplineSchema.extend({
  id: identitySchema.shape.id,
  status: z.enum(["active", "archived"], { error: "Selecciona un estado válido." }),
});
const listSchema = z.object({
  tenantId: z.string().uuid(),
  page: z.number().int().min(1).max(10_000),
  pageSize: z.number().int().min(1).max(50),
  search: z.string().trim().max(200),
  status: z.enum(["active", "archived", "all"]),
});

type Deps = { disciplines: DisciplineAdministrationPort };

export function listDisciplines(input: DisciplineListInput, deps: Deps) {
  return deps.disciplines.list(parseWithSchema(listSchema, input));
}

export function updateDiscipline(input: Omit<z.input<typeof updateSchema>, "status"> & { status: unknown }, deps: Deps) {
  return deps.disciplines.update(parseWithSchema(updateSchema, input));
}

export function deleteDiscipline(input: z.input<typeof identitySchema>, deps: Deps) {
  return deps.disciplines.delete(parseWithSchema(identitySchema, input));
}
