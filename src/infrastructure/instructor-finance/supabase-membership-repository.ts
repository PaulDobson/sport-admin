import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type {
  BillingCycle,
  MembershipPlan,
  MembershipPlanStatus,
  StudentMembership,
  StudentMembershipStatus,
} from "@/domain/instructor-finance/membership";
import type {
  CreateMembershipInput,
  CreateMembershipPlanInput,
  MembershipRepositoryPort,
  SetMembershipPlanStatusInput,
  TransitionMembershipInput,
  UpdateMembershipPlanInput,
} from "@/application/instructor-finance/ports/membership-repository-port";

const planColumns =
  "id,tenant_id,name,price,currency,billing_cycle,expiration_grace_days,benefits,status";

const cycleDurationDays: Record<BillingCycle, number> = {
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
  annual: 365,
};

interface MembershipRow {
  id: string;
  tenant_id: string;
  student_id: string;
  plan_id: string;
  starts_at: string;
  expires_at: string;
  next_billing_date: string;
  agreed_price: number | string;
  currency: string;
  billing_cycle: BillingCycle;
  status: StudentMembershipStatus;
  past_due_since: string | null;
  paused_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  membership_plans: { expiration_grace_days: number };
}

interface MembershipPlanRow {
  id: string;
  tenant_id: string;
  name: string;
  price: number | string;
  currency: string;
  billing_cycle: BillingCycle;
  expiration_grace_days: number;
  benefits: unknown;
  status: MembershipPlanStatus;
}

function toPlan(row: MembershipPlanRow): MembershipPlan {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    price: Number(row.price),
    currency: row.currency,
    billingCycle: row.billing_cycle,
    expirationGraceDays: row.expiration_grace_days,
    benefits: Array.isArray(row.benefits) ? (row.benefits as string[]) : [],
    status: row.status,
  };
}

function toMembership(row: MembershipRow): StudentMembership {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentId: row.student_id,
    planId: row.plan_id,
    startsOn: row.starts_at,
    expiresOn: row.expires_at,
    nextBillingDate: row.next_billing_date,
    agreedPrice: Number(row.agreed_price),
    currency: row.currency,
    billingCycle: row.billing_cycle,
    expirationGraceDays: row.membership_plans.expiration_grace_days,
    status: row.status,
    pastDueSince: row.past_due_since ?? undefined,
    pausedAt: row.paused_at ? new Date(row.paused_at) : undefined,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SupabaseMembershipRepository implements MembershipRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async createPlan(input: CreateMembershipPlanInput) {
    const { data, error } = await this.client
      .from("membership_plans")
      .insert({
        tenant_id: input.tenantId,
        name: input.name,
        price: input.price,
        duration_days: cycleDurationDays[input.billingCycle],
        currency: input.currency,
        billing_cycle: input.billingCycle,
        expiration_grace_days: input.expirationGraceDays,
        benefits: input.benefits,
      })
      .select(planColumns)
      .single();
    if (error) throw error;
    return toPlan(data as unknown as MembershipPlanRow);
  }

  async updatePlan(input: UpdateMembershipPlanInput) {
    const { data, error } = await this.client
      .from("membership_plans")
      .update({
        name: input.name,
        price: input.price,
        duration_days: cycleDurationDays[input.billingCycle],
        currency: input.currency,
        billing_cycle: input.billingCycle,
        expiration_grace_days: input.expirationGraceDays,
        benefits: input.benefits,
      })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.planId)
      .select(planColumns)
      .single();
    if (error) throw error;
    return toPlan(data as unknown as MembershipPlanRow);
  }

  async setPlanStatus(input: SetMembershipPlanStatusInput) {
    const { data, error } = await this.client
      .from("membership_plans")
      .update({ status: input.status })
      .eq("tenant_id", input.tenantId)
      .eq("id", input.planId)
      .select(planColumns)
      .single();
    if (error) throw error;
    return toPlan(data as unknown as MembershipPlanRow);
  }

  async findPlanById(tenantId: string, planId: string) {
    const { data, error } = await this.client
      .from("membership_plans")
      .select(planColumns)
      .eq("tenant_id", tenantId)
      .eq("id", planId)
      .maybeSingle();
    if (error) throw error;
    return data ? toPlan(data as unknown as MembershipPlanRow) : null;
  }

  async findPlans(tenantId: string, status?: MembershipPlanStatus) {
    const query = this.client
      .from("membership_plans")
      .select(`${planColumns},student_memberships(count)`)
      .eq("tenant_id", tenantId);
    const { data, error } = await (
      status ? query.eq("status", status) : query
    ).order("name");
    if (error) throw error;
    return (
      data as unknown as Array<
        MembershipPlanRow & { student_memberships: Array<{ count: number }> }
      >
    ).map((row) => ({
      ...toPlan(row),
      membershipCount: row.student_memberships?.[0]?.count ?? 0,
    }));
  }

  async findActivePlans(tenantId: string) {
    const { data, error } = await this.client
      .from("membership_plans")
      .select(planColumns)
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("name");
    if (error) throw error;
    return (data as unknown as MembershipPlanRow[]).map(toPlan);
  }

  async create(input: CreateMembershipInput) {
    const { data, error } = await this.client.rpc(
      "activate_student_membership",
      {
        target_tenant: input.tenantId,
        target_student: input.studentId,
        target_plan: input.planId,
        target_starts_on: input.startsOn,
        target_actor_membership: input.actorMembershipId,
        target_operation_id: input.operationId,
      },
    );
    if (error) throw error;
    const membership = await this.findById(input.tenantId, data as string);
    if (!membership) throw new Error("Failed to load activated membership");
    return membership;
  }

  async transition(input: TransitionMembershipInput) {
    const { data, error } = await this.client.rpc(
      "transition_student_membership",
      {
        target_tenant: input.tenantId,
        target_membership: input.membershipId,
        target_transition: input.transition,
        target_effective_on: input.effectiveOn,
        target_actor_membership: input.actorMembershipId,
        target_operation_id: input.operationId,
      },
    );
    if (error) throw error;
    const membership = await this.findById(input.tenantId, data as string);
    if (!membership) throw new Error("Failed to load transitioned membership");
    return membership;
  }

  async findById(tenantId: string, membershipId: string) {
    const { data, error } = await this.client
      .from("student_memberships")
      .select("*, membership_plans!inner(expiration_grace_days)")
      .eq("tenant_id", tenantId)
      .eq("id", membershipId)
      .maybeSingle();
    if (error) throw error;
    return data ? toMembership(data as unknown as MembershipRow) : null;
  }

  async findByStudent(tenantId: string, studentId: string) {
    const { data, error } = await this.client
      .from("student_memberships")
      .select("*, membership_plans!inner(expiration_grace_days)")
      .eq("tenant_id", tenantId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as MembershipRow[]).map(toMembership);
  }
}
