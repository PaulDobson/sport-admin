import { SupabaseDisciplineAdministrationRepository } from "@/infrastructure/instructor-operations/supabase-discipline-administration-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";

export async function createDisciplineAdministrationDeps() {
  const client = await createSupabaseServerClient();
  return { disciplines: new SupabaseDisciplineAdministrationRepository(client) };
}
