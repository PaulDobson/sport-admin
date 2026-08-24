import { z } from "zod";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { ScheduleRepositoryPort } from "../ports/schedule-repository-port";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const schema = z
  .object({
    tenantId: z.string().uuid(),
    classTemplateId: z.string().uuid(),
    locationId: z.string().uuid(),
    instructorMembershipId: z.string().uuid(),
    dayOfWeek: z.number().int().min(0).max(6),
    startsAt: z.string().regex(timePattern),
    endsAt: z.string().regex(timePattern),
    timezone: z.string().trim().min(1),
    allowConflict: z.boolean().default(false),
  })
  .refine((input) => input.endsAt > input.startsAt, {
    message: "Schedule end must be after start",
    path: ["endsAt"],
  })
  .refine(
    (input) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: input.timezone });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Timezone is invalid", path: ["timezone"] },
  );

export async function createClassSchedule(
  input: z.input<typeof schema>,
  deps: { schedules: ScheduleRepositoryPort },
) {
  const parsed = parseWithSchema(schema, input);
  if (!parsed.allowConflict && (await deps.schedules.hasConflict(parsed))) {
    throw new BusinessRuleViolationError(
      "Schedule conflict requires explicit confirmation",
    );
  }
  return deps.schedules.createSchedule(parsed);
}
