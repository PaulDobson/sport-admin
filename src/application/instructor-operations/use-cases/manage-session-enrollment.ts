import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { SessionRepositoryPort } from "../ports/session-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export async function enrollStudentInSession(
  input: z.input<typeof schema>,
  deps: { sessions: SessionRepositoryPort },
) {
  return deps.sessions.enroll(parseWithSchema(schema, input));
}

export async function cancelSessionEnrollment(
  input: z.input<typeof schema>,
  deps: { sessions: SessionRepositoryPort },
) {
  return deps.sessions.cancelEnrollment(parseWithSchema(schema, input));
}
