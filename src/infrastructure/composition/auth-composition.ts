import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { getSiteUrl } from "@/infrastructure/supabase/env";
import { SupabaseAuthAdapter } from "@/infrastructure/auth/supabase-auth-adapter";
import { SupabaseTenantRepository } from "@/infrastructure/tenants/supabase-tenant-repository";
import { SupabaseTenantMembershipRepository } from "@/infrastructure/tenants/supabase-tenant-membership-repository";
import { SupabaseAuditLog } from "@/infrastructure/audit/supabase-audit-log";

/**
 * Builds the request-scoped dependencies auth use cases need, wired to Supabase.
 * Presentation (Server Actions, Route Handlers) calls this instead of importing
 * concrete adapters directly, keeping the layering rule intact.
 */
export async function createAuthDeps() {
  const client = await createSupabaseServerClient();
  const siteUrl = getSiteUrl();

  return {
    auth: new SupabaseAuthAdapter(client, siteUrl),
    tenants: new SupabaseTenantRepository(client),
    memberships: new SupabaseTenantMembershipRepository(client),
    audit: new SupabaseAuditLog(client),
  };
}
