import { z } from "zod";
import { BusinessRuleViolationError, ConflictError, NotFoundError, UnauthorizedError } from "@/domain/shared/errors";

export function parseBillingContract<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new BusinessRuleViolationError(
    "La respuesta de cobranza es incompatible. Verifica las migraciones SaaS 0048 a 0053 en este entorno.",
  );
  return result.data;
}

export function throwBillingRpcError(error: { code: string; message: string }): never {
  if (error.code === "PGRST202" || error.code === "42883") throw new BusinessRuleViolationError(
    "La gestión de cobranza y emisor no está instalada. Aplica la migración SaaS 0048 después de validarla.",
  );
  if (error.code === "42501") throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
  if (error.code === "40001") throw new ConflictError("Otro administrador cambió el emisor. Recarga la versión vigente antes de guardar.");
  if (error.code === "23505") throw new ConflictError("El identificador de operación ya fue utilizado con otros datos. Revisa el resultado antes de reintentar.");
  if (error.code === "P0002") throw new NotFoundError("Cobro", "solicitado");
  if (error.code === "22023") throw new BusinessRuleViolationError("Revisa los filtros o los datos del emisor antes de continuar.");
  throw error;
}
