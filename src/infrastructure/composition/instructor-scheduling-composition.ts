import { SupabaseScheduleRepository } from "@/infrastructure/instructor-operations/supabase-schedule-repository";
import { SupabaseScheduleCatalogRepository } from "@/infrastructure/instructor-operations/supabase-schedule-catalog-repository";
import { SupabaseSessionPublishingRepository } from "@/infrastructure/instructor-operations/supabase-session-publishing-repository";
import { SupabaseLocationRepository } from "@/infrastructure/instructor-operations/supabase-location-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { SupabaseClassTemplateAdministrationRepository } from "@/infrastructure/instructor-operations/supabase-class-template-administration-repository";
import { SupabaseProgrammingBatchRepository } from "@/infrastructure/instructor-operations/supabase-programming-batch-repository";

export async function createInstructorSchedulingDeps() {
  const client = await createSupabaseServerClient();
  return {
    programming: new SupabaseProgrammingBatchRepository(client),
    classes: new SupabaseClassTemplateAdministrationRepository(client),
    schedules: new SupabaseScheduleRepository(client),
    catalog: new SupabaseScheduleCatalogRepository(client),
    publishing: new SupabaseSessionPublishingRepository(client),
    locations: new SupabaseLocationRepository(client),
  };
}
