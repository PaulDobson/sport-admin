import { createSupabaseServerClient } from "@/infrastructure/supabase/server-client";
import { SupabaseMembershipRepository } from "@/infrastructure/instructor-finance/supabase-membership-repository";
import { SupabasePaymentRepository } from "@/infrastructure/instructor-finance/supabase-payment-repository";
import { SupabaseFinancialProjectionRepository } from "@/infrastructure/instructor-finance/supabase-financial-projection-repository";
import { SupabaseMembershipFollowUpRepository } from "@/infrastructure/instructor-finance/supabase-membership-follow-up-repository";

export async function createInstructorFinanceDeps() {
  const client = await createSupabaseServerClient();
  return {
    memberships: new SupabaseMembershipRepository(client),
    payments: new SupabasePaymentRepository(client),
    financialProjections: new SupabaseFinancialProjectionRepository(client),
    membershipFollowUps: new SupabaseMembershipFollowUpRepository(client),
  };
}
