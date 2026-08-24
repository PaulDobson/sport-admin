import type {
  FinancialAdjustment,
  MembershipPayment,
} from "@/domain/instructor-finance/payment";
import type { ProjectionMembership } from "@/domain/instructor-finance/projection";

export interface FinancialProjectionData {
  memberships: ProjectionMembership[];
  payments: MembershipPayment[];
  adjustments: FinancialAdjustment[];
}

export interface FinancialProjectionRepositoryPort {
  loadMonth(tenantId: string, period: string): Promise<FinancialProjectionData>;
}
