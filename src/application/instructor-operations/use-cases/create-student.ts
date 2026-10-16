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

const contactSchema = z.object({
  type: z.enum(["email", "phone", "emergency"]),
  label: z.string().trim().min(1).nullable().default(null),
  value: z.string().trim().min(1, "Contact value is required"),
  isPrimary: z.boolean().default(false),
});

const createStudentSchema = z.object({
  tenantId: z.string().uuid(),
  fullName: z.string().trim().min(1, "Student name is required"),
  photoUrl: z.string().url().nullable().default(null),
  birthDate: z.iso.date().nullable().default(null),
  gender: optionalGender.default(null),
  heightCm: optionalNumber(300).default(null),
  weightKg: optionalNumber(500).default(null),
  emergencyContactName: z.string().trim().min(1).nullable().default(null),
  emergencyContactEmail: z.email().nullable().default(null),
  emergencyContactPhone: z.string().trim().min(1).nullable().default(null),
  contacts: z.array(contactSchema).default([]),
});

export type CreateStudentInput = z.input<typeof createStudentSchema>;

export async function createStudent(
  input: CreateStudentInput,
  deps: { students: StudentRepositoryPort },
) {
  return deps.students.create(parseWithSchema(createStudentSchema, input));
}
