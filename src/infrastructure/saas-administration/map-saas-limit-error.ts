import { BusinessRuleViolationError } from "@/domain/shared/errors";

interface DatabaseError {
  code?: string;
  message?: string;
}

export function throwMappedSaasLimitError(error: unknown): never {
  const databaseError = error as DatabaseError;
  if (databaseError.code === "P0001") {
    const usage = databaseError.message?.match(/\((\d+\/\d+)\)/)?.[1];
    if (databaseError.message?.startsWith("SaaS student limit reached")) {
      throw new BusinessRuleViolationError(
        `Límite de alumnos alcanzado${usage ? ` (${usage})` : ""}. Archiva un alumno activo o mejora el plan.`,
      );
    }
    if (databaseError.message?.startsWith("SaaS user limit reached")) {
      throw new BusinessRuleViolationError(
        `Límite de usuarios alcanzado${usage ? ` (${usage})` : ""}. Desactiva un usuario o mejora el plan.`,
      );
    }
  }
  throw error;
}
