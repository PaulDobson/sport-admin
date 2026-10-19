import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { SupabaseTenantDetails } from "@/infrastructure/tenants/supabase-tenant-details";

export async function createTenantDetailsDeps() {
  return new SupabaseTenantDetails(await createSupabaseServerClient());
}
