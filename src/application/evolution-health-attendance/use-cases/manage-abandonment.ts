import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import { evaluateAbandonmentRisk } from "@/domain/evolution-health-attendance/abandonment";
import type { AbandonmentRepositoryPort } from "../ports/abandonment-repository-port";

const identitySchema = z.object({
  tenantId: z.string().uuid(),
  instructorMembershipId: z.string().uuid(),
});

const policySchema = identitySchema.extend({
  consecutiveAbsencesThreshold: z.number().int().min(1).max(20),
  attendancePercentageThreshold: z.number().min(0).max(100),
  lookbackDays: z.number().int().min(1).max(365),
});

const evaluateSchema = identitySchema.extend({
  studentId: z.string().uuid(),
  evaluatedAt: z.date(),
});

const alertSchema = z.object({
  tenantId: z.string().uuid(),
  alertId: z.string().uuid(),
  resolvedAt: z.date(),
});

const historySchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export function configureAbandonmentPolicy(
  input: z.input<typeof policySchema>,
  deps: { abandonment: AbandonmentRepositoryPort },
) {
  return deps.abandonment.savePolicy(parseWithSchema(policySchema, input));
}

export async function evaluateStudentAbandonment(
  input: z.input<typeof evaluateSchema>,
  deps: { abandonment: AbandonmentRepositoryPort },
) {
  const parsed = parseWithSchema(evaluateSchema, input);
  const policy = await deps.abandonment.findPolicy(
    parsed.tenantId,
    parsed.instructorMembershipId,
  );
  const effectivePolicy = policy ?? {
    tenantId: parsed.tenantId,
    instructorMembershipId: parsed.instructorMembershipId,
    consecutiveAbsencesThreshold: 3,
    attendancePercentageThreshold: 50,
    lookbackDays: 30,
  };
  const since = new Date(parsed.evaluatedAt);
  since.setUTCDate(since.getUTCDate() - effectivePolicy.lookbackDays);
  const observations = await deps.abandonment.listAttendance({
    ...parsed,
    since,
    until: parsed.evaluatedAt,
  });
  const risk = evaluateAbandonmentRisk(
    observations,
    effectivePolicy,
    parsed.evaluatedAt,
  );
  if (!risk) return null;
  return deps.abandonment.upsertOpenAlert({
    tenantId: parsed.tenantId,
    studentId: parsed.studentId,
    reason: risk.reason,
    periodStart: risk.periodStart,
    periodEnd: risk.periodEnd,
    deduplicationKey: [
      "abandonment",
      parsed.instructorMembershipId,
      parsed.studentId,
      risk.criterion,
    ].join(":"),
  });
}

export function resolveAbandonmentAlert(
  input: z.input<typeof alertSchema>,
  deps: { abandonment: AbandonmentRepositoryPort },
) {
  const parsed = parseWithSchema(alertSchema, input);
  return deps.abandonment.resolveAlert(
    parsed.tenantId,
    parsed.alertId,
    parsed.resolvedAt,
  );
}

export function getAbandonmentAlertHistory(
  input: z.input<typeof historySchema>,
  deps: { abandonment: AbandonmentRepositoryPort },
) {
  const parsed = parseWithSchema(historySchema, input);
  return deps.abandonment.listAlertHistory(parsed.tenantId, parsed.studentId);
}
