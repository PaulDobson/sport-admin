import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { SupabaseOwnerBilling } from "@/infrastructure/saas-administration/supabase-owner-billing";
export async function createOwnerBillingDeps() {
  return { ownerBilling: new SupabaseOwnerBilling(await createSupabaseServerClient()) };
}
