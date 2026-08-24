import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { SupabaseTenantBackoffice } from "@/infrastructure/saas-administration/supabase-tenant-backoffice";
import { SupabaseSaasEntitlements } from "@/infrastructure/saas-administration/supabase-saas-entitlements";
import { SupabaseSaasFinancialDashboard } from "@/infrastructure/saas-administration/supabase-saas-financial-dashboard";

export async function createSaasAdministrationDeps() {
  const client = await createSupabaseServerClient();
  return {
    tenantBackoffice: new SupabaseTenantBackoffice(client),
    entitlements: new SupabaseSaasEntitlements(client),
    financialDashboard: new SupabaseSaasFinancialDashboard(client),
  };
}
