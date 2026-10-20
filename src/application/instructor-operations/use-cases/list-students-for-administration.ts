import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { StudentRepositoryPort } from "../ports/student-repository-port";

const listStudentsForAdministrationSchema = z.object({
  tenantId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .default(null),
  status: z.enum(["active", "archived", "all"]).default("active"),
});

export type ListStudentsForAdministrationInput = z.input<
  typeof listStudentsForAdministrationSchema
>;

export async function listStudentsForAdministration(
  input: ListStudentsForAdministrationInput,
  deps: { students: StudentRepositoryPort },
) {
  const parsed = parseWithSchema(listStudentsForAdministrationSchema, input);
  const result = await deps.students.listForAdministration(parsed);
  const lastPage = Math.max(1, Math.ceil(result.total / parsed.pageSize));
  if (parsed.page > lastPage) {
    return deps.students.listForAdministration({ ...parsed, page: lastPage });
  }
  return result;
}
