import type {
  FinancialAdjustment,
  MembershipBalance,
  MembershipPayment,
} from "@/domain/instructor-finance/payment";

export interface RecordPaymentInput {
  tenantId: string;
  membershipId: string;
  amount: number;
  currency: string;
  paidAt: Date;
  reference?: string;
  actorMembershipId: string;
  operationId: string;
  adjustments: Array<{
    kind: "discount" | "credit" | "tax";
    amount: number;
    reason: string;
  }>;
}

export interface PaymentRepositoryPort {
  record(input: RecordPaymentInput): Promise<MembershipPayment>;
  getBalance(
    tenantId: string,
    membershipId: string,
  ): Promise<MembershipBalance>;
  listHistory(
    tenantId: string,
    membershipId: string,
  ): Promise<{
    payments: MembershipPayment[];
    adjustments: FinancialAdjustment[];
  }>;
}
