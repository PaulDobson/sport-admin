import type { FinancialLedger,FinancialLedgerRequest } from "@/domain/saas-administration/financial-ledger";
export interface FinancialLedgerPort {
  isPlatformAdmin(): Promise<boolean>;
  get(input: FinancialLedgerRequest): Promise<FinancialLedger>;
}
