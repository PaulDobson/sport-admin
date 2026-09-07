import type {
  MembershipPlan,
  MembershipPlanStatus,
  MembershipTransition,
  StudentMembership,
} from "@/domain/instructor-finance/membership";

export interface CreateMembershipInput {
  tenantId: string;
  studentId: string;
  planId: string;
  startsOn: string;
  actorMembershipId: string;
  operationId: string;
}

export interface CreateMembershipPlanInput {
  tenantId: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: "monthly" | "quarterly" | "semiannual" | "annual";
  expirationGraceDays: number;
  benefits: string[];
}

export interface UpdateMembershipPlanInput {
  tenantId: string;
  planId: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: "monthly" | "quarterly" | "semiannual" | "annual";
  expirationGraceDays: number;
  benefits: string[];
}

export interface SetMembershipPlanStatusInput {
  tenantId: string;
  planId: string;
  status: MembershipPlanStatus;
}

export interface TransitionMembershipInput {
  tenantId: string;
  membershipId: string;
  transition: MembershipTransition;
  effectiveOn: string;
  actorMembershipId: string;
  operationId: string;
}

export interface MembershipRepositoryPort {
  createPlan(input: CreateMembershipPlanInput): Promise<MembershipPlan>;
  updatePlan(input: UpdateMembershipPlanInput): Promise<MembershipPlan>;
  setPlanStatus(input: SetMembershipPlanStatusInput): Promise<MembershipPlan>;
  findActivePlans(tenantId: string): Promise<MembershipPlan[]>;
  findPlans(
    tenantId: string,
    status?: MembershipPlanStatus,
  ): Promise<MembershipPlan[]>;
  findPlanById(
    tenantId: string,
    planId: string,
  ): Promise<MembershipPlan | null>;
  create(input: CreateMembershipInput): Promise<StudentMembership>;
  transition(input: TransitionMembershipInput): Promise<StudentMembership>;
  findById(
    tenantId: string,
    membershipId: string,
  ): Promise<StudentMembership | null>;
  findByStudent(
    tenantId: string,
    studentId: string,
  ): Promise<StudentMembership[]>;
}
