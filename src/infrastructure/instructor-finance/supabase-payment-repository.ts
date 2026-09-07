import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type {
  FinancialAdjustment,
  MembershipPayment,
  MembershipPaymentStatus,
  PaymentMethod,
} from "@/domain/instructor-finance/payment";
import { calculateMembershipBalance } from "@/domain/instructor-finance/payment";
import type {
  PaymentRepositoryPort,
  RecordPaymentInput,
} from "@/application/instructor-finance/ports/payment-repository-port";

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
  kind: "discount" | "credit" | "tax";
  amount: number | string;
  currency: string;
  effective_on: string;
  reason: string;
  created_at: string;
}

function toPayment(row: PaymentRow): MembershipPayment {
  return {
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
  };
}

function toAdjustment(row: AdjustmentRow): FinancialAdjustment {
  return {
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
  };
}

export class SupabasePaymentRepository implements PaymentRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async record(input: RecordPaymentInput) {
    const { data, error } = await this.client.rpc("record_membership_payment", {
      target_tenant: input.tenantId,
      target_membership: input.membershipId,
      target_amount: input.amount,
      target_currency: input.currency,
      target_paid_at: input.paidAt.toISOString(),
      target_reference: input.reference ?? "",
      target_actor_membership: input.actorMembershipId,
      target_operation_id: input.operationId,
      target_method: input.method,
      target_adjustments: input.adjustments,
    });
    if (error) throw error;
    const { data: payment, error: loadError } = await this.client
      .from("student_membership_payments")
      .select("*")
      .eq("tenant_id", input.tenantId)
      .eq("id", data as string)
      .single();
    if (loadError) throw loadError;
    return toPayment(payment as PaymentRow);
  }

  async getBalance(tenantId: string, membershipId: string) {
    const [{ data: membership, error: membershipError }, history] =
      await Promise.all([
        this.client
          .from("student_memberships")
          .select("agreed_price,currency")
          .eq("tenant_id", tenantId)
          .eq("id", membershipId)
          .single(),
        this.listHistory(tenantId, membershipId),
      ]);
    if (membershipError) throw membershipError;
    return calculateMembershipBalance({
      membershipId,
      currency: membership.currency,
      contractedAmount: Number(membership.agreed_price),
      ...history,
    });
  }

  async listHistory(tenantId: string, membershipId: string) {
    const [paymentResult, adjustmentResult] = await Promise.all([
      this.client
        .from("student_membership_payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("membership_id", membershipId)
        .order("created_at", { ascending: false }),
      this.client
        .from("student_membership_adjustments")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("membership_id", membershipId)
        .order("effective_on", { ascending: false }),
    ]);
    if (paymentResult.error) throw paymentResult.error;
    if (adjustmentResult.error) throw adjustmentResult.error;
    return {
      payments: (paymentResult.data as PaymentRow[]).map(toPayment),
      adjustments: (adjustmentResult.data as AdjustmentRow[]).map(toAdjustment),
    };
  }

  async listPaymentsByPeriod(
    tenantId: string,
    period: string,
    method?: PaymentMethod,
  ) {
    const periodStart = new Date(`${period}-01T00:00:00Z`);
    const periodEnd = new Date(periodStart);
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
    const query = this.client
      .from("student_membership_payments")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "paid")
      .gte("paid_at", periodStart.toISOString())
      .lt("paid_at", periodEnd.toISOString());
    const { data, error } = await (
      method ? query.eq("method", method) : query
    ).order("paid_at", { ascending: false });
    if (error) throw error;
    return (data as PaymentRow[]).map(toPayment);
  }
}
