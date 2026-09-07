import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { CollectionAccount } from "@/domain/instructor-finance/collection";
import type { StudentMembershipStatus } from "@/domain/instructor-finance/membership";
import type {
  FinancialAdjustmentKind,
  MembershipPaymentStatus,
} from "@/domain/instructor-finance/payment";
import { calculateMembershipBalance } from "@/domain/instructor-finance/payment";
import type { CollectionRepositoryPort } from "@/application/instructor-finance/ports/collection-repository-port";

interface MembershipRow {
  id: string;
  student_id: string;
  status: StudentMembershipStatus;
  expires_at: string;
  next_billing_date: string;
  agreed_price: number | string;
  currency: string;
  students: { full_name: string };
  membership_plans: { name: string; expiration_grace_days: number };
}

interface PaymentRow {
  membership_id: string;
  amount: number | string;
  status: MembershipPaymentStatus;
}

interface AdjustmentRow {
  membership_id: string;
  kind: FinancialAdjustmentKind;
  amount: number | string;
}

export class SupabaseCollectionRepository implements CollectionRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async listAccounts(tenantId: string): Promise<CollectionAccount[]> {
    const [membershipResult, paymentResult, adjustmentResult] =
      await Promise.all([
        this.client
          .from("student_memberships")
          .select(
            "id,student_id,status,expires_at,next_billing_date,agreed_price,currency,students!inner(full_name),membership_plans!inner(name,expiration_grace_days)",
          )
          .eq("tenant_id", tenantId)
          .in("status", ["active", "past_due", "expired"]),
        this.client
          .from("student_membership_payments")
          .select("membership_id,amount,status")
          .eq("tenant_id", tenantId),
        this.client
          .from("student_membership_adjustments")
          .select("membership_id,kind,amount")
          .eq("tenant_id", tenantId),
      ]);
    if (membershipResult.error) throw membershipResult.error;
    if (paymentResult.error) throw paymentResult.error;
    if (adjustmentResult.error) throw adjustmentResult.error;

    const payments = paymentResult.data as PaymentRow[];
    const adjustments = adjustmentResult.data as AdjustmentRow[];

    return (membershipResult.data as unknown as MembershipRow[]).map((row) => {
      const balance = calculateMembershipBalance({
        membershipId: row.id,
        currency: row.currency,
        contractedAmount: Number(row.agreed_price),
        payments: payments
          .filter((payment) => payment.membership_id === row.id)
          .map((payment) => ({
            id: "",
            tenantId,
            membershipId: row.id,
            amount: Number(payment.amount),
            currency: row.currency,
            status: payment.status,
            method: "other" as const,
            operationId: "",
            createdAt: new Date(0),
          })),
        adjustments: adjustments
          .filter((adjustment) => adjustment.membership_id === row.id)
          .map((adjustment) => ({
            id: "",
            tenantId,
            membershipId: row.id,
            kind: adjustment.kind,
            amount: Number(adjustment.amount),
            currency: row.currency,
            effectiveOn: "",
            reason: "",
            createdAt: new Date(0),
          })),
      });
      return {
        membershipId: row.id,
        studentId: row.student_id,
        studentName: row.students.full_name,
        planName: row.membership_plans.name,
        status: row.status,
        expiresOn: row.expires_at,
        nextBillingDate: row.next_billing_date,
        expirationGraceDays: row.membership_plans.expiration_grace_days,
        currency: row.currency,
        contractedAmount: Number(row.agreed_price),
        balance: balance.balance,
      };
    });
  }
}
