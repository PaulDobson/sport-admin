import { z } from "zod";

const calendarDate = z.iso.date();
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa una hora válida (HH:mm).");
export const programmingSchema = z.object({
  operationId: z.string().uuid(),
  classTemplateId: z.string().uuid(),
  instructorMembershipId: z.string().uuid().optional(),
  timezone: z.string().min(1).refine((value) => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
    catch { return false; }
  }, "Selecciona una zona horaria válida."),
  mode: z.enum(["weekly", "once"]),
  fromDate: calendarDate,
  throughDate: calendarDate,
  waitlistEnabled: z.boolean(),
  allowConflict: z.boolean(),
  slots: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startsAt: clockTime,
    endsAt: clockTime,
    locationId: z.string().uuid(),
    date: calendarDate.optional(),
    endDate: calendarDate.optional(),
  })).min(1).max(28),
}).superRefine((input, ctx) => {
  const horizon = (Date.parse(input.throughDate) - Date.parse(input.fromDate)) / 86_400_000;
  if (horizon < 0 || horizon > 56) {
    ctx.addIssue({ code: "custom", message: "El rango no puede superar 56 días.", path: ["throughDate"] });
  }
  input.slots.forEach((slot, index) => {
    if (input.slots.slice(0, index).some((other) =>
      other.dayOfWeek === slot.dayOfWeek && other.startsAt === slot.startsAt &&
      other.endsAt === slot.endsAt && other.locationId === slot.locationId &&
      other.date === slot.date && other.endDate === slot.endDate)) {
      ctx.addIssue({ code: "custom", message: "Hay bloques duplicados.", path: ["slots", index] });
    }
    if (input.mode === "weekly" && slot.endsAt <= slot.startsAt) {
      ctx.addIssue({ code: "custom", message: "La hora de término debe ser posterior al inicio.", path: ["slots", index] });
    }
    if (input.mode === "once") {
      if (!slot.date || !slot.endDate || slot.date < input.fromDate ||
        slot.endDate > input.throughDate || `${slot.endDate}T${slot.endsAt}` <= `${slot.date}T${slot.startsAt}`) {
        ctx.addIssue({ code: "custom", message: "Revisa las fechas y horas de la sesión única.", path: ["slots", index] });
      }
    }
  });
});

export type ProgrammingInput = z.infer<typeof programmingSchema>;
export interface ProgrammingPreview {
  newCount: number;
  existingCount: number;
  occurrences: Array<{ startsAt: string; endsAt: string; locationId: string }>;
  conflicts: Array<{ message: string }>;
  fingerprint?: string;
}
export interface ProgrammingBatchPort {
  execute(input: {
    tenantId: string;
    instructorMembershipId: string;
    programming: ProgrammingInput;
    intent: "save" | "publish";
    commit: boolean;
    previewFingerprint?: string;
  }): Promise<ProgrammingPreview>;
}
