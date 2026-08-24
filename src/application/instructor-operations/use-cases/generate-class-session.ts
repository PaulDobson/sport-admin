import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { SessionRepositoryPort } from "../ports/session-repository-port";

const schema = z
  .object({
    tenantId: z.string().uuid(),
    classScheduleId: z.string().uuid(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    waitlistEnabled: z.boolean().default(true),
  })
  .refine((input) => input.endsAt > input.startsAt, {
    message: "Session end must be after start",
    path: ["endsAt"],
  });

export async function generateClassSession(
  input: z.input<typeof schema>,
  deps: { sessions: SessionRepositoryPort },
) {
  return deps.sessions.generate(parseWithSchema(schema, input));
}
