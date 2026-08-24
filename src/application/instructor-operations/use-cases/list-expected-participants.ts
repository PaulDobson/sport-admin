import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { SessionRepositoryPort } from "../ports/session-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export async function listExpectedParticipants(
  input: z.input<typeof schema>,
  deps: { sessions: SessionRepositoryPort },
) {
  const parsed = parseWithSchema(schema, input);
  return deps.sessions.listExpectedParticipants(
    parsed.tenantId,
    parsed.sessionId,
  );
}
