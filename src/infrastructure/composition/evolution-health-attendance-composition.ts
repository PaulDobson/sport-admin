import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { SupabaseAbandonmentRepository } from "@/infrastructure/evolution-health-attendance/supabase-abandonment-repository";
import { SupabaseAttendanceRepository } from "@/infrastructure/evolution-health-attendance/supabase-attendance-repository";
import { SupabaseHealthRepository } from "@/infrastructure/evolution-health-attendance/supabase-health-repository";
import { SupabaseMetricRepository } from "@/infrastructure/evolution-health-attendance/supabase-metric-repository";

export async function createEvolutionHealthAttendanceDeps() {
  const client = await createSupabaseServerClient();
  return {
    abandonment: new SupabaseAbandonmentRepository(client),
    attendance: new SupabaseAttendanceRepository(client),
    health: new SupabaseHealthRepository(client),
    metrics: new SupabaseMetricRepository(client),
  };
}
