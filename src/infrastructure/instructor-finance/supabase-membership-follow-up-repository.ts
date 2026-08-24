import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudentMembershipStatus } from "@/domain/instructor-finance/membership";
import type {
  FinancialAdjustmentKind,
  MembershipPaymentStatus,
} from "@/domain/instructor-finance/payment";
import { calculateMembershipBalance } from "@/domain/instructor-finance/payment";
import type { MembershipFollowUpRepositoryPort } from "@/application/instructor-finance/ports/membership-follow-up-repository-port";

interface MembershipRow {
  id: string;
  student_id: string;
  status: StudentMembershipStatus;
  expires_at: string;
  next_billing_date: string;
  past_due_since: string | null;
  agreed_price: number | string;
  currency: string;
  students: { full_name: string };
}

interface PaymentRow {
  id: string;
  tenant_id: string;
  membership_id: string;
  amount: number | string;
  currency: string;
  status: MembershipPaymentStatus;
  paid_at: string | null;
  reference: string | null;
  operation_id: string;
  created_at: string;
}

interface AdjustmentRow {
  id: string;
  tenant_id: string;
  membership_id: string;
  payment_id: string | null;
  kind: FinancialAdjustmentKind;
  amount: number | string;
  currency: string;
  effective_on: string;
  reason: string;
  created_at: string;
}

export class SupabaseMembershipFollowUpRepository implements MembershipFollowUpRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async listByTenant(tenantId: string) {
    const [membershipResult, paymentResult, adjustmentResult] =
      await Promise.all([
        this.client
          .from("student_memberships")
          .select(
            "id,student_id,status,expires_at,next_billing_date,past_due_since,agreed_price,currency,students!inner(full_name)",
          )
          .eq("tenant_id", tenantId)
          .in("status", ["active", "past_due", "expired"]),
        this.client
          .from("student_membership_payments")
          .select(
            "id,tenant_id,membership_id,amount,currency,status,paid_at,reference,operation_id,created_at",
          )
          .eq("tenant_id", tenantId),
        this.client
          .from("student_membership_adjustments")
          .select(
            "id,tenant_id,membership_id,payment_id,kind,amount,currency,effective_on,reason,created_at",
          )
          .eq("tenant_id", tenantId),
      ]);
    if (membershipResult.error) throw membershipResult.error;
    if (paymentResult.error) throw paymentResult.error;
    if (adjustmentResult.error) throw adjustmentResult.error;

    const payments = (paymentResult.data as PaymentRow[]).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      membershipId: row.membership_id,
      amount: Number(row.amount),
      currency: row.currency,
      status: row.status,
      paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
      reference: row.reference ?? undefined,
      operationId: row.operation_id,
      createdAt: new Date(row.created_at),
    }));
    const adjustments = (adjustmentResult.data as AdjustmentRow[]).map(
      (row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        membershipId: row.membership_id,
        paymentId: row.payment_id ?? undefined,
        kind: row.kind,
        amount: Number(row.amount),
        currency: row.currency,
        effectiveOn: row.effective_on,
        reason: row.reason,
        createdAt: new Date(row.created_at),
      }),
    );

    return (membershipResult.data as unknown as MembershipRow[]).map((row) => {
      const balance = calculateMembershipBalance({
        membershipId: row.id,
        currency: row.currency,
        contractedAmount: Number(row.agreed_price),
        payments: payments.filter((payment) => payment.membershipId === row.id),
        adjustments: adjustments.filter(
          (adjustment) => adjustment.membershipId === row.id,
        ),
      });
      return {
        membershipId: row.id,
        studentId: row.student_id,
        studentName: row.students.full_name,
        status: row.status,
        expiresOn: row.expires_at,
        nextBillingDate: row.next_billing_date,
        pastDueSince: row.past_due_since ?? undefined,
        currency: row.currency,
        balance: balance.balance,
      };
    });
  }
}
