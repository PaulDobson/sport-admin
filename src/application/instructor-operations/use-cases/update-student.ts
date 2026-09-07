import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { StudentRepositoryPort } from "../ports/student-repository-port";

const primaryContactSchema = z.object({
  type: z.enum(["email", "phone", "emergency"]),
  label: z.string().trim().min(1).nullable().default(null),
  value: z.string().trim().min(1, "Contact value is required"),
});

const updateStudentSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().min(1),
  fullName: z.string().trim().min(1, "Student name is required"),
  birthDate: z.iso.date().nullable().default(null),
  primaryContact: primaryContactSchema.nullable().default(null),
});

export type UpdateStudentInput = z.input<typeof updateStudentSchema>;

export async function updateStudent(
  input: UpdateStudentInput,
  deps: { students: StudentRepositoryPort },
) {
  const parsed = parseWithSchema(updateStudentSchema, input);
  return deps.students.update(parsed);
}
