import type { MembershipFollowUpAccount } from "@/domain/instructor-finance/membership-follow-up";

export interface MembershipFollowUpRepositoryPort {
  listByTenant(tenantId: string): Promise<MembershipFollowUpAccount[]>;
}
