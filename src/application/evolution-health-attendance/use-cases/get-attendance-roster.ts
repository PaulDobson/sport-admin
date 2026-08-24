import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { AttendanceRepositoryPort } from "../ports/attendance-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export async function getAttendanceRoster(
  input: z.input<typeof schema>,
  deps: { attendance: AttendanceRepositoryPort },
) {
  const parsed = parseWithSchema(schema, input);
  return deps.attendance.listExpectedParticipants(
    parsed.tenantId,
    parsed.sessionId,
  );
}
