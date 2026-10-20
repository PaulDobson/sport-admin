import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { SupabaseSessionRepository } from "@/infrastructure/instructor-operations/supabase-session-repository";

export async function createInstructorSessionDeps() {
  const client = await createSupabaseServerClient();
  return { sessions: new SupabaseSessionRepository(client) };
}
