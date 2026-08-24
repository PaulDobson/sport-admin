import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { InstructorDay } from "@/domain/instructor-operations/instructor-day";
import type { InstructorDayRepositoryPort } from "../ports/instructor-day-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
  locationId: z.string().uuid().optional().catch(undefined),
  now: z.coerce.date(),
});

export async function getInstructorDay(
  input: z.input<typeof schema>,
  deps: { instructorDay: InstructorDayRepositoryPort },
): Promise<InstructorDay> {
  const parsed = parseWithSchema(schema, input);
  const [activeStudents, locations, sessions] = await Promise.all([
    deps.instructorDay.countActiveStudents(parsed.tenantId),
    deps.instructorDay.listActiveLocations(parsed.tenantId),
    deps.instructorDay.listOpenSessions(parsed),
  ]);
  const ordered = sessions.toSorted(
    (first, second) => first.startsAt.getTime() - second.startsAt.getTime(),
  );
  const currentSession =
    ordered.find(
      (session) =>
        session.startsAt <= parsed.now && session.endsAt > parsed.now,
    ) ?? null;

  return {
    activeStudents,
    locations,
    currentSession,
    upcomingSessions: ordered.filter(
      (session) => session.id !== currentSession?.id,
    ),
    pendingEnrollments: ordered.reduce(
      (total, session) => total + session.waitlistedCount,
      0,
    ),
  };
}
