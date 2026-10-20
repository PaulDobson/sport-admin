import { financialLedgerSchema,type FinancialLedgerRequest } from "@/domain/saas-administration/financial-ledger";
import type { FinancialLedgerPort } from "@/application/saas-administration/ports/financial-ledger-port";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { parseBillingContract } from "./billing-rpc-contract";
import { throwPaymentRpcError } from "./supabase-billing-payments";
export class SupabaseFinancialLedger implements FinancialLedgerPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}
  async isPlatformAdmin() {
    const { data,error } = await this.client.rpc("is_platform_admin"); if (error) throw error; return data === true;
  }
  async get(input: FinancialLedgerRequest) {
    const { data,error } = await this.client.rpc("get_saas_financial_ledger",{
      target_period: input.period,target_currency: input.currency,target_metric: input.metric,page_number: input.page,
    });
    if (error) {
      if (["PGRST202","42883"].includes(error.code)) throw new BusinessRuleViolationError("El detalle financiero requiere la migración SaaS 0052.");
      throwPaymentRpcError(error);
    }
    const result = parseBillingContract(financialLedgerSchema,data);
    if (result.period !== input.period || result.currency !== input.currency || result.metric !== input.metric || result.page !== input.page) throw new BusinessRuleViolationError("El detalle no corresponde a los filtros financieros solicitados.");
    return result;
  }
}
