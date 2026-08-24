import { randomUUID } from "node:crypto";
import { NotFoundError } from "@/domain/shared/errors";
import {
  calculateMembershipBalance,
  type FinancialAdjustment,
  type MembershipPayment,
} from "@/domain/instructor-finance/payment";
import type {
  PaymentRepositoryPort,
  RecordPaymentInput,
} from "../ports/payment-repository-port";

export class FakePaymentRepository implements PaymentRepositoryPort {
  memberships: Array<{
    id: string;
    tenantId: string;
    agreedPrice: number;
    currency: string;
  }> = [];
  payments: MembershipPayment[] = [];
  adjustments: FinancialAdjustment[] = [];
  events: Array<{ operationId: string; type: string }> = [];

  async record(input: RecordPaymentInput) {
    const existing = this.payments.find(
      (payment) =>
        payment.tenantId === input.tenantId &&
        payment.operationId === input.operationId,
    );
    if (existing) return existing;
    const membership = this.memberships.find(
      (item) =>
        item.tenantId === input.tenantId && item.id === input.membershipId,
    );
    if (!membership)
      throw new NotFoundError("Student membership", input.membershipId);
    const now = new Date();
    const payment: MembershipPayment = {
      id: randomUUID(),
      tenantId: input.tenantId,
      membershipId: input.membershipId,
      amount: input.amount,
      currency: input.currency,
      status: "paid",
      paidAt: input.paidAt,
      reference: input.reference,
      operationId: input.operationId,
      createdAt: now,
    };
    this.payments.push(payment);
    this.adjustments.push(
      ...input.adjustments.map((adjustment) => ({
        id: randomUUID(),
        tenantId: input.tenantId,
        membershipId: input.membershipId,
        paymentId: payment.id,
        currency: input.currency,
        effectiveOn: input.paidAt.toISOString().slice(0, 10),
        createdAt: now,
        ...adjustment,
      })),
    );
    this.events.push({
      operationId: input.operationId,
      type: "payment_recorded",
    });
    return payment;
  }

  async getBalance(tenantId: string, membershipId: string) {
    const membership = this.memberships.find(
      (item) => item.tenantId === tenantId && item.id === membershipId,
    );
    if (!membership)
      throw new NotFoundError("Student membership", membershipId);
    return calculateMembershipBalance({
      membershipId,
      currency: membership.currency,
      contractedAmount: membership.agreedPrice,
      payments: this.payments.filter(
        (payment) =>
          payment.tenantId === tenantId &&
          payment.membershipId === membershipId,
      ),
      adjustments: this.adjustments.filter(
        (adjustment) =>
          adjustment.tenantId === tenantId &&
          adjustment.membershipId === membershipId,
      ),
    });
  }

  async listHistory(tenantId: string, membershipId: string) {
    return {
      payments: this.payments.filter(
        (payment) =>
          payment.tenantId === tenantId &&
          payment.membershipId === membershipId,
      ),
      adjustments: this.adjustments.filter(
        (adjustment) =>
          adjustment.tenantId === tenantId &&
          adjustment.membershipId === membershipId,
      ),
    };
  }
}
