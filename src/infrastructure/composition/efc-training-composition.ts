import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import {
  SupabaseMacrocycleRepository,
  SupabaseMicrocycleRepository,
  SupabaseAthleteProfileRepository,
  SupabaseOneRmRepository,
  SupabaseWeightControlRepository,
} from "@/infrastructure/efc-training";

/**
 * Creates all EFC training dependencies backed by Supabase.
 * Call once per request in a Server Component or Server Action.
 */
export async function createEfcTrainingDeps() {
  const client = await createSupabaseServerClient();
  return {
    macrocycles: new SupabaseMacrocycleRepository(client),
    microcycles: new SupabaseMicrocycleRepository(client),
    profiles: new SupabaseAthleteProfileRepository(client),
    oneRm: new SupabaseOneRmRepository(client),
    weightControl: new SupabaseWeightControlRepository(client),
  };
}
