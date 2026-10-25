import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";

export interface InstructorSetupState {
  /** True when the wizard should be shown. Becomes false once all four pillars
   *  have at least one active record, or when the tenant is older than 7 days. */
  showWizard: boolean;
  hasDiscipline: boolean;
  hasLocation: boolean;
  hasPlan: boolean;
  hasStudent: boolean;
  hasMembership: boolean;
}

const WIZARD_WINDOW_DAYS = 7;

/**
 * Determines whether the instructor setup wizard should be shown.
 *
 * Strategy: a tenant that is fresh (≤ 7 days old) AND still missing at
 * least one of the three core pillars (discipline, billing plan, student)
 * should see the wizard. We use HEAD-only count queries so there is no
 * over-fetching; all three run in parallel.
 *
 * No database migration is required — the "new user" signal is inferred
 * from the tenant's age and the absence of operational data.
 */
export async function checkInstructorSetup(
  tenantId: string,
  tenantCreatedAt: Date,
): Promise<InstructorSetupState> {
  // Stop showing after WIZARD_WINDOW_DAYS days regardless of completeness.
  const ageMs = Date.now() - tenantCreatedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > WIZARD_WINDOW_DAYS) {
    return {
      showWizard: false,
      hasDiscipline: true,
      hasLocation: true,
      hasPlan: true,
      hasStudent: true,
      hasMembership: true,
    };
  }

  const client = await createSupabaseServerClient();

  const [
    disciplinesResult,
    locationsResult,
    plansResult,
    studentsResult,
    membershipsResult,
  ] = await Promise.all([
    client
      .from("disciplines")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .limit(1),
    client
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .limit(1),
    client
      .from("membership_plans")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .limit(1),
    client
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .limit(1),
    client
      .from("student_memberships")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .limit(1),
  ]);

  const hasDiscipline = (disciplinesResult.count ?? 0) > 0;
  const hasLocation = (locationsResult.count ?? 0) > 0;
  const hasPlan = (plansResult.count ?? 0) > 0;
  const hasStudent = (studentsResult.count ?? 0) > 0;
  const hasMembership = (membershipsResult.count ?? 0) > 0;

  const showWizard =
    !hasDiscipline || !hasLocation || !hasPlan || !hasStudent || !hasMembership;

  return {
    showWizard,
    hasDiscipline,
    hasLocation,
    hasPlan,
    hasStudent,
    hasMembership,
  };
}
