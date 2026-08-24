import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { StudentRepositoryPort } from "../ports/student-repository-port";

const archiveStudentSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().min(1),
});

export async function archiveStudent(
  input: z.input<typeof archiveStudentSchema>,
  deps: { students: StudentRepositoryPort },
) {
  const parsed = parseWithSchema(archiveStudentSchema, input);
  return deps.students.archive(parsed.tenantId, parsed.studentId);
}
