import type {
  HealthCondition,
  HealthRestriction,
  Injury,
  SessionParticipantHealth,
  StudentHealthHistory,
} from "@/domain/evolution-health-attendance/health";

export interface CreateHealthConditionInput {
  tenantId: string;
  studentId: string;
  name: string;
  source: string;
  notes?: string;
  startedOn?: string;
}

export interface CreateInjuryInput {
  tenantId: string;
  studentId: string;
  name: string;
  bodyArea?: string;
  painLevel?: number;
  source: string;
  notes?: string;
  occurredOn?: string;
}

export interface CreateHealthRestrictionInput {
  tenantId: string;
  studentId: string;
  conditionId?: string;
  injuryId?: string;
  description: string;
  operationalAction: string;
  severity: "red" | "yellow" | "green";
  source: string;
  startsOn: string;
  endsOn?: string;
}

export interface HealthRepositoryPort {
  createCondition(input: CreateHealthConditionInput): Promise<HealthCondition>;
  updateCondition(
    tenantId: string,
    conditionId: string,
    changes: { notes?: string; source?: string },
  ): Promise<HealthCondition>;
  resolveCondition(
    tenantId: string,
    conditionId: string,
    resolvedAt: Date,
  ): Promise<HealthCondition>;
  createInjury(input: CreateInjuryInput): Promise<Injury>;
  updateInjury(
    tenantId: string,
    injuryId: string,
    changes: { painLevel?: number; notes?: string },
  ): Promise<Injury>;
  resolveInjury(
    tenantId: string,
    injuryId: string,
    resolvedAt: Date,
  ): Promise<Injury>;
  createRestriction(
    input: CreateHealthRestrictionInput,
  ): Promise<HealthRestriction>;
  resolveRestriction(
    tenantId: string,
    restrictionId: string,
    resolvedAt: Date,
  ): Promise<HealthRestriction>;
  listHistory(
    tenantId: string,
    studentId: string,
  ): Promise<StudentHealthHistory>;
  listSessionParticipantHealth(
    tenantId: string,
    sessionId: string,
    onDate: string,
  ): Promise<SessionParticipantHealth[]>;
  recordAccess(
    tenantId: string,
    studentId: string,
    entityType: string,
    entityId: string,
  ): Promise<void>;
}
