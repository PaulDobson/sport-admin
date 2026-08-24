import { z } from "zod";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { SaasEntitlementsPort } from "../ports/saas-entitlements-port";

const inputSchema = z.object({
  tenantId: z.string().uuid(),
  feature: z.enum(["reports", "offline", "realtime"]),
});

export async function requireSaasFeature(
  input: z.input<typeof inputSchema>,
  entitlements: SaasEntitlementsPort,
) {
  const validInput = parseWithSchema(inputSchema, input);
  if (
    !(await entitlements.canUseFeature(validInput.tenantId, validInput.feature))
  ) {
    throw new BusinessRuleViolationError(
      "Esta función no está disponible en el plan actual. Mejora el plan para habilitarla.",
    );
  }
}
