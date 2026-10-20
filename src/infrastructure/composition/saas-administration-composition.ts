import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { SupabaseTenantBackoffice } from "@/infrastructure/saas-administration/supabase-tenant-backoffice";
import { SupabaseSaasEntitlements } from "@/infrastructure/saas-administration/supabase-saas-entitlements";
import { SupabaseSaasFinancialDashboard } from "@/infrastructure/saas-administration/supabase-saas-financial-dashboard";
import { SupabasePlanCatalog } from "@/infrastructure/saas-administration/supabase-plan-catalog";
import { SupabaseSubscriptionManagement } from "@/infrastructure/saas-administration/supabase-subscription-management";
import { SupabaseRenewalProcessing } from "@/infrastructure/saas-administration/supabase-renewal-processing";
import { SupabaseCollections } from "@/infrastructure/saas-administration/supabase-collections";
import { SupabaseBillingIssuer } from "@/infrastructure/saas-administration/supabase-billing-issuer";
import { SupabaseBillingPayments } from "@/infrastructure/saas-administration/supabase-billing-payments";
import { SupabaseFinancialLedger } from "@/infrastructure/saas-administration/supabase-financial-ledger";

export async function createSaasAdministrationDeps() {
  const client = await createSupabaseServerClient();
  return {
    tenantBackoffice: new SupabaseTenantBackoffice(client),
    entitlements: new SupabaseSaasEntitlements(client),
    financialDashboard: new SupabaseSaasFinancialDashboard(client),
    planCatalog: new SupabasePlanCatalog(client),
    subscriptions: new SupabaseSubscriptionManagement(client),
    renewals: new SupabaseRenewalProcessing(client),
    collections: new SupabaseCollections(client),
    billingIssuer: new SupabaseBillingIssuer(client),
    billingPayments: new SupabaseBillingPayments(client),
    financialLedger: new SupabaseFinancialLedger(client),
  };
}
