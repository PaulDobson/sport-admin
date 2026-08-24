import { SupabaseOperationalReportRepository } from "@/infrastructure/reporting/supabase-operational-report-repository";
import { SupabaseLocationRepository } from "@/infrastructure/instructor-operations/supabase-location-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";

export async function createReportingDeps() {
  const client = await createSupabaseServerClient();
  return {
    operationalReports: new SupabaseOperationalReportRepository(client),
    locations: new SupabaseLocationRepository(client),
  };
}
