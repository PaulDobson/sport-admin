import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { SessionRepositoryPort } from "../ports/session-repository-port";

const schema = z
  .object({
    tenantId: z.string().uuid(),
    sessionId: z.string().uuid(),
    locationId: z.string().uuid().optional(),
    instructorMembershipId: z.string().uuid().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    capacity: z.number().int().positive().optional(),
    waitlistEnabled: z.boolean().optional(),
    status: z.enum(["scheduled", "cancelled", "completed"]).optional(),
  })
  .refine(
    (input) =>
      !input.startsAt || !input.endsAt || input.endsAt > input.startsAt,
    { message: "Session end must be after start", path: ["endsAt"] },
  );

export async function editClassSession(
  input: z.input<typeof schema>,
  deps: { sessions: SessionRepositoryPort },
) {
  return deps.sessions.update(parseWithSchema(schema, input));
}
