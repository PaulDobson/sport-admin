import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { AttendanceRepositoryPort } from "../ports/attendance-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  recordedByMembershipId: z.string().uuid(),
  items: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(["present", "absent", "late", "excused"]),
        note: z.string().trim().optional(),
        operationId: z.string().uuid(),
      }),
    )
    .min(1)
    .superRefine((items, context) => {
      const studentIds = new Set<string>();
      const operationIds = new Set<string>();
      items.forEach((item, index) => {
        if (studentIds.has(item.studentId)) {
          context.addIssue({
            code: "custom",
            path: [index, "studentId"],
            message: "Student appears more than once in the batch",
          });
        }
        if (operationIds.has(item.operationId)) {
          context.addIssue({
            code: "custom",
            path: [index, "operationId"],
            message: "Operation ID appears more than once in the batch",
          });
        }
        studentIds.add(item.studentId);
        operationIds.add(item.operationId);
      });
    }),
});

export async function saveAttendanceBatch(
  input: z.input<typeof schema>,
  deps: { attendance: AttendanceRepositoryPort },
) {
  return deps.attendance.saveBatch(parseWithSchema(schema, input));
}
