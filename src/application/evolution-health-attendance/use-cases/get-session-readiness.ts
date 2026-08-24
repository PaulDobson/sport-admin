import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type {
  HealthRestriction,
  HealthSeverity,
  StudentReadiness,
} from "@/domain/evolution-health-attendance/health";
import type { HealthRepositoryPort } from "../ports/health-repository-port";

const schema = z.object({
  tenantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  onDate: z.string().date(),
  checkedAt: z.coerce.date(),
});

const priority: Record<HealthSeverity, number> = {
  red: 3,
  yellow: 2,
  green: 1,
};

function highestPriority(
  restrictions: HealthRestriction[],
): HealthRestriction | undefined {
  return [...restrictions].sort(
    (left, right) => priority[right.severity] - priority[left.severity],
  )[0];
}

export async function getSessionReadiness(
  input: z.input<typeof schema>,
  deps: { health: HealthRepositoryPort },
): Promise<StudentReadiness[]> {
  const parsed = parseWithSchema(schema, input);
  const participants = await deps.health.listSessionParticipantHealth(
    parsed.tenantId,
    parsed.sessionId,
    parsed.onDate,
  );

  return Promise.all(
    participants.map(async (participant) => {
      await deps.health.recordAccess(
        parsed.tenantId,
        participant.studentId,
        "session_health_readiness",
        parsed.sessionId,
      );
      const restriction = highestPriority(participant.restrictions);
      return {
        studentId: participant.studentId,
        studentName: participant.studentName,
        level: restriction?.severity ?? "green",
        reason: restriction?.description ?? "Sin alertas de salud registradas",
        operationalAction:
          restriction?.operationalAction ??
          "Confirmar el estado actual con el alumno",
        restrictionId: restriction?.id,
        checkedAt: parsed.checkedAt,
      };
    }),
  );
}
