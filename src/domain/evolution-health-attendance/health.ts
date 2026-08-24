export type HealthRecordStatus = "active" | "resolved";
export type HealthSeverity = "red" | "yellow" | "green";

interface HealthRecordBase {
  id: string;
  tenantId: string;
  studentId: string;
  source: string;
  status: HealthRecordStatus;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthCondition extends HealthRecordBase {
  name: string;
  notes?: string;
  startedOn?: string;
}

export interface Injury extends HealthRecordBase {
  name: string;
  bodyArea?: string;
  painLevel?: number;
  notes?: string;
  occurredOn?: string;
}

export interface HealthRestriction extends HealthRecordBase {
  conditionId?: string;
  injuryId?: string;
  description: string;
  operationalAction: string;
  severity: HealthSeverity;
  startsOn: string;
  endsOn?: string;
}

export interface StudentHealthHistory {
  conditions: HealthCondition[];
  injuries: Injury[];
  restrictions: HealthRestriction[];
}

export interface SensitiveAuditEvent {
  action: "read" | "insert" | "update";
  entityType: string;
  entityId: string;
  studentId: string;
}

export interface SessionParticipantHealth {
  studentId: string;
  studentName: string;
  restrictions: HealthRestriction[];
}

export interface StudentReadiness {
  studentId: string;
  studentName: string;
  level: HealthSeverity;
  reason: string;
  operationalAction: string;
  restrictionId?: string;
  checkedAt: Date;
}
