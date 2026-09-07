export type FinancialAdjustmentKind = "discount" | "credit" | "tax";
export type MembershipPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "voided";
export type PaymentMethod = "cash" | "transfer" | "card" | "other";

export const paymentMethods: readonly PaymentMethod[] = [
  "cash",
  "transfer",
  "card",
  "other",
];

export interface MembershipPayment {
  id: string;
  tenantId: string;
  membershipId: string;
  amount: number;
  currency: string;
  status: MembershipPaymentStatus;
  method: PaymentMethod;
  paidAt?: Date;
  reference?: string;
  operationId: string;
  createdAt: Date;
}

export interface FinancialAdjustment {
  id: string;
  tenantId: string;
  membershipId: string;
  paymentId?: string;
  kind: FinancialAdjustmentKind;
  amount: number;
  currency: string;
  effectiveOn: string;
  reason: string;
  createdAt: Date;
}

export interface MembershipBalance {
  membershipId: string;
  currency: string;
  contractedAmount: number;
  adjustedAmount: number;
  paidAmount: number;
  balance: number;
}

export function calculateMembershipBalance(input: {
  membershipId: string;
  currency: string;
  contractedAmount: number;
  payments: MembershipPayment[];
  adjustments: FinancialAdjustment[];
}): MembershipBalance {
  const adjustedAmount = input.adjustments.reduce((total, adjustment) => {
    const direction = adjustment.kind === "tax" ? 1 : -1;
    return total + direction * adjustment.amount;
  }, input.contractedAmount);
  const paidAmount = input.payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + payment.amount, 0);
  return {
    membershipId: input.membershipId,
    currency: input.currency,
    contractedAmount: input.contractedAmount,
    adjustedAmount,
    paidAmount,
    balance: adjustedAmount - paidAmount,
  };
}
