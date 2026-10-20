import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { getSiteUrl } from "@/infrastructure/supabase/env";
import { SupabaseStudentPortalRepository } from "@/infrastructure/student-portal/supabase-student-portal-repository";

export async function createStudentPortalDeps() {
  const client = await createSupabaseServerClient();
  return {
    portal: new SupabaseStudentPortalRepository(client),
    siteUrl: getSiteUrl(),
  };
}
