import type { OwnerBillingPort } from "@/application/saas-administration/ports/owner-billing-port";
import { ownerBillingSchema } from "@/domain/saas-administration/owner-billing";
import { BusinessRuleViolationError,UnauthorizedError } from "@/domain/shared/errors";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import { parseBillingContract } from "./billing-rpc-contract";
import { throwPaymentRpcError } from "./supabase-billing-payments";
export class SupabaseOwnerBilling implements OwnerBillingPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}
  async get(tenantId: string,page: number) {
    const { data,error } = await this.client.rpc("get_my_saas_billing",{ target_tenant: tenantId,page_number: page });
    if (error) {
      if (["PGRST202","42883"].includes(error.code)) throw new BusinessRuleViolationError("Mi suscripción requiere la migración SaaS 0051.");
      if (error.code === "42501") throw new UnauthorizedError("Se requiere una membresía activa de dueño para consultar esta academia.");
      throwPaymentRpcError(error);
    }
    const billing = parseBillingContract(ownerBillingSchema,data);
    if (billing.tenant_id !== tenantId || billing.page !== page) throw new BusinessRuleViolationError("La suscripción recibida no corresponde a la academia solicitada.");
    return billing;
  }
}
