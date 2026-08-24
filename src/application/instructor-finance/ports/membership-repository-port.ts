import type {
  MembershipPlan,
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
  findActivePlans(tenantId: string): Promise<MembershipPlan[]>;
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
