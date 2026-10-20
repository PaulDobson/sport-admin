import { financialLedgerRequestSchema } from "@/domain/saas-administration/financial-ledger";
import { UnauthorizedError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { FinancialLedgerPort } from "../ports/financial-ledger-port";
export async function getFinancialLedger(input: unknown,port: FinancialLedgerPort) {
  if (!(await port.isPlatformAdmin())) throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
  return port.get(parseWithSchema(financialLedgerRequestSchema,input));
}
