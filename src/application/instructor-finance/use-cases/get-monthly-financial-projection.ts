import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import { calculateMonthlyFinancialProjections } from "@/domain/instructor-finance/projection";
import type { FinancialProjectionRepositoryPort } from "../ports/financial-projection-repository-port";

const inputSchema = z.object({
  tenantId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export async function getMonthlyFinancialProjection(
  input: z.input<typeof inputSchema>,
  deps: { financialProjections: FinancialProjectionRepositoryPort },
) {
  const parsed = parseWithSchema(inputSchema, input);
  const data = await deps.financialProjections.loadMonth(
    parsed.tenantId,
    parsed.period,
  );
  return calculateMonthlyFinancialProjections({
    period: parsed.period,
    ...data,
  });
}
