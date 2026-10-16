import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { SessionPublishingPort } from "../ports/session-publishing-port";

const uuid = z.string().uuid();
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

const oneOffSchema = z
  .object({
    tenantId: uuid,
    classTemplateId: uuid,
    locationId: uuid,
    instructorMembershipId: uuid,
    startsAtLocal: localDateTime,
    endsAtLocal: localDateTime,
    timezone: z.string().trim().min(1),
    waitlistEnabled: z.boolean().default(true),
  })
  .refine((input) => input.endsAtLocal > input.startsAtLocal, {
    message: "El término debe ser posterior al inicio.",
    path: ["endsAtLocal"],
  })
  .refine((input) => isValidTimezone(input.timezone), {
    message: "Selecciona una zona horaria válida.",
    path: ["timezone"],
  });

const publishScheduleSchema = z
  .object({
    tenantId: uuid,
    classScheduleId: uuid,
    fromDate: dateOnly,
    throughDate: dateOnly,
    waitlistEnabled: z.boolean().default(true),
  })
  .refine((input) => input.throughDate >= input.fromDate, {
    message: "La fecha final debe ser posterior a la inicial.",
    path: ["throughDate"],
  })
  .refine(
    (input) =>
      (Date.parse(`${input.throughDate}T00:00:00Z`) -
        Date.parse(`${input.fromDate}T00:00:00Z`)) /
        86_400_000 <=
      56,
    {
      message: "Publica hasta ocho semanas por vez.",
      path: ["throughDate"],
    },
  );

export async function createOneOffSession(
  input: z.input<typeof oneOffSchema>,
  deps: { publishing: SessionPublishingPort },
) {
  return deps.publishing.createOneOff(parseWithSchema(oneOffSchema, input));
}

export async function publishRecurringSessions(
  input: z.input<typeof publishScheduleSchema>,
  deps: { publishing: SessionPublishingPort },
) {
  return deps.publishing.publishSchedule(
    parseWithSchema(publishScheduleSchema, input),
  );
}
