import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type {
  BillingCycle,
  StudentMembershipStatus,
} from "@/domain/instructor-finance/membership";
import type {
  FinancialAdjustmentKind,
  MembershipPaymentStatus,
  PaymentMethod,
} from "@/domain/instructor-finance/payment";
import type { FinancialProjectionRepositoryPort } from "@/application/instructor-finance/ports/financial-projection-repository-port";

interface MembershipRow {
  id: string;
  starts_at: string;
  expires_at: string;
  agreed_price: number | string;
  currency: string;
  billing_cycle: BillingCycle;
  status: StudentMembershipStatus;
  membership_plans: { expiration_grace_days: number };
}

interface PaymentRow {
  id: string;
  tenant_id: string;
  membership_id: string;
  amount: number | string;
  currency: string;
  status: MembershipPaymentStatus;
  method: PaymentMethod;
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

function monthBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  return {
    start: `${period}-01`,
    end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}

export class SupabaseFinancialProjectionRepository implements FinancialProjectionRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async loadMonth(tenantId: string, period: string) {
    const { start, end } = monthBounds(period);
    const [membershipResult, paymentResult, adjustmentResult] =
      await Promise.all([
        this.client
          .from("student_memberships")
          .select(
            "id,starts_at,expires_at,agreed_price,currency,billing_cycle,status,membership_plans!inner(expiration_grace_days)",
          )
          .eq("tenant_id", tenantId)
          .lte("starts_at", end)
          .in("status", ["active", "past_due"]),
        this.client
          .from("student_membership_payments")
          .select(
            "id,tenant_id,membership_id,amount,currency,status,paid_at,reference,operation_id,created_at",
          )
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("paid_at", `${start}T00:00:00.000Z`)
          .lte("paid_at", `${end}T23:59:59.999Z`),
        this.client
          .from("student_membership_adjustments")
          .select(
            "id,tenant_id,membership_id,payment_id,kind,amount,currency,effective_on,reason,created_at",
          )
          .eq("tenant_id", tenantId)
          .gte("effective_on", start)
          .lte("effective_on", end),
      ]);
    if (membershipResult.error) throw membershipResult.error;
    if (paymentResult.error) throw paymentResult.error;
    if (adjustmentResult.error) throw adjustmentResult.error;

    return {
      memberships: (membershipResult.data as unknown as MembershipRow[]).map(
        (row) => ({
          id: row.id,
          startsOn: row.starts_at,
          expiresOn: row.expires_at,
          agreedPrice: Number(row.agreed_price),
          currency: row.currency,
          billingCycle: row.billing_cycle,
          status: row.status,
          expirationGraceDays: row.membership_plans.expiration_grace_days,
        }),
      ),
      payments: (paymentResult.data as PaymentRow[]).map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        membershipId: row.membership_id,
        amount: Number(row.amount),
        currency: row.currency,
        status: row.status,
        method: row.method ?? "other",
        paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
        reference: row.reference ?? undefined,
        operationId: row.operation_id,
        createdAt: new Date(row.created_at),
      })),
      adjustments: (adjustmentResult.data as AdjustmentRow[]).map((row) => ({
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
      })),
    };
  }
}
