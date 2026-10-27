import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { AttendanceRepositoryPort } from "../ports/attendance-repository-port";

const baseSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
});

const monthSchema = baseSchema.extend({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export async function getStudentAttendanceHistory(
  input: z.input<typeof baseSchema>,
  deps: { attendance: AttendanceRepositoryPort },
) {
  const parsed = parseWithSchema(baseSchema, input);
  return deps.attendance.listStudentHistory(parsed.tenantId, parsed.studentId);
}

export async function getStudentAttendanceMonthlySummary(
  input: z.input<typeof baseSchema>,
  deps: { attendance: AttendanceRepositoryPort },
) {
  const parsed = parseWithSchema(baseSchema, input);
  return deps.attendance.listStudentMonthlySummary(
    parsed.tenantId,
    parsed.studentId,
  );
}

export async function getStudentAttendanceMonthDetail(
  input: z.input<typeof monthSchema>,
  deps: { attendance: AttendanceRepositoryPort },
) {
  const parsed = parseWithSchema(monthSchema, input);
  return deps.attendance.listStudentMonthDetail(
    parsed.tenantId,
    parsed.studentId,
    parsed.year,
    parsed.month,
  );
}
