import { randomUUID } from "node:crypto";
import { SupabaseRenewalProcessing } from "@/infrastructure/saas-administration/supabase-renewal-processing";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";
import { getSaasRenewalReadiness, getSaasRenewalWorkerSecret } from "@/infrastructure/supabase/env";

export function getSaasRenewalConfiguration() {
  return getSaasRenewalReadiness();
}
export function getSaasRenewalAuthorizationSecret() {
  return getSaasRenewalWorkerSecret();
}
export function createSaasRenewalWorkerDeps() {
  return { renewals: new SupabaseRenewalProcessing(createSupabaseServiceRoleClient()), newRequestId: randomUUID };
}
