import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { StudentRepositoryPort } from "../ports/student-repository-port";

const optionalNumber = (maximum: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : Number(value)),
    z.number().finite().positive().max(maximum).nullable(),
  );

const optionalGender = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.enum(["female", "male", "other"]).nullable(),
);

const optionalEmail = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === ""
      ? null
      : typeof value === "string"
        ? value.trim()
        : value,
  z.email().nullable(),
);

const updateStudentSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().min(1),
  fullName: z.string().trim().min(1, "Student name is required"),
  birthDate: z.iso.date().nullable().default(null),
  photoUrl: z.string().url().nullable().default(null),
  gender: optionalGender.default(null),
  heightCm: optionalNumber(300).default(null),
  weightKg: optionalNumber(500).default(null),
  emergencyContactName: z.string().trim().min(1).nullable().default(null),
  emergencyContactEmail: z.email().nullable().default(null),
  emergencyContactPhone: z.string().trim().min(1).nullable().default(null),
  contactEmail: optionalEmail.default(null),
  contactPhone: z.string().trim().min(1).nullable().default(null),
});

export type UpdateStudentInput = z.input<typeof updateStudentSchema>;

export async function updateStudent(
  input: UpdateStudentInput,
  deps: { students: StudentRepositoryPort },
) {
  const parsed = parseWithSchema(updateStudentSchema, input);
  return deps.students.update(parsed);
}
