import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { InstructorDay } from "@/domain/instructor-operations/instructor-day";
import type { InstructorDayRepositoryPort } from "../ports/instructor-day-repository-port";

const operationalTimezone = "America/Santiago";
const operationalDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: operationalTimezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function operationalDateKey(date: Date): string {
  const parts = Object.fromEntries(
    operationalDateFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function nextOperationalDayStart(now: Date): Date {
  const dateParts = Object.fromEntries(
    operationalDateFormatter
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  const tomorrow = new Date(
    Date.UTC(
      Number(dateParts.year),
      Number(dateParts.month) - 1,
      Number(dateParts.day) + 1,
    ),
  );
  const targetDate = [
    tomorrow.getUTCFullYear(),
    String(tomorrow.getUTCMonth() + 1).padStart(2, "0"),
    String(tomorrow.getUTCDate()).padStart(2, "0"),
  ].join("-");
  const targetUtc = tomorrow.getTime();
  let lowerBound = targetUtc - 48 * 60 * 60 * 1000;
  let upperBound = targetUtc + 48 * 60 * 60 * 1000;

  while (upperBound - lowerBound > 1) {
    const midpoint = Math.floor((lowerBound + upperBound) / 2);
    const dateKey = operationalDateKey(new Date(midpoint));
    if (dateKey >= targetDate) upperBound = midpoint;
    else lowerBound = midpoint;
  }

  return new Date(upperBound);
}

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
    deps.instructorDay.listOpenSessions({
      ...parsed,
      startsBefore: nextOperationalDayStart(parsed.now),
    }),
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
