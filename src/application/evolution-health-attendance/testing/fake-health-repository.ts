import { NotFoundError } from "@/domain/shared/errors";
import type {
  HealthCondition,
  HealthRestriction,
  Injury,
  SessionParticipantHealth,
  SensitiveAuditEvent,
} from "@/domain/evolution-health-attendance/health";
import type {
  CreateHealthConditionInput,
  CreateHealthRestrictionInput,
  CreateInjuryInput,
  HealthRepositoryPort,
} from "../ports/health-repository-port";

export class FakeHealthRepository implements HealthRepositoryPort {
  readonly conditions: HealthCondition[] = [];
  readonly injuries: Injury[] = [];
  readonly restrictions: HealthRestriction[] = [];
  readonly auditEvents: SensitiveAuditEvent[] = [];
  readonly sessionParticipants: Array<{
    tenantId: string;
    sessionId: string;
    studentId: string;
    studentName: string;
  }> = [];

  private audit(
    action: "read" | "insert" | "update",
    entityType: string,
    entityId: string,
    studentId: string,
  ) {
    this.auditEvents.push({ action, entityType, entityId, studentId });
  }

  private id(prefix: string, sequence: number) {
    return `${prefix}-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
  }

  async createCondition(input: CreateHealthConditionInput) {
    const now = new Date();
    const condition: HealthCondition = {
      ...input,
      id: this.id("41000000", this.conditions.length + 1),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.conditions.push(condition);
    this.audit(
      "insert",
      "health_conditions",
      condition.id,
      condition.studentId,
    );
    return condition;
  }

  async updateCondition(
    tenantId: string,
    conditionId: string,
    changes: { notes?: string; source?: string },
  ) {
    const condition = this.conditions.find(
      (item) => item.tenantId === tenantId && item.id === conditionId,
    );
    if (!condition) throw new NotFoundError("Health condition", conditionId);
    Object.assign(condition, changes, { updatedAt: new Date() });
    this.audit(
      "update",
      "health_conditions",
      condition.id,
      condition.studentId,
    );
    return condition;
  }

  async resolveCondition(
    tenantId: string,
    conditionId: string,
    resolvedAt: Date,
  ) {
    const condition = this.conditions.find(
      (item) => item.tenantId === tenantId && item.id === conditionId,
    );
    if (!condition) throw new NotFoundError("Health condition", conditionId);
    Object.assign(condition, {
      status: "resolved" as const,
      resolvedAt,
      updatedAt: new Date(),
    });
    this.audit(
      "update",
      "health_conditions",
      condition.id,
      condition.studentId,
    );
    return condition;
  }

  async createInjury(input: CreateInjuryInput) {
    const now = new Date();
    const injury: Injury = {
      ...input,
      id: this.id("42000000", this.injuries.length + 1),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.injuries.push(injury);
    this.audit("insert", "injuries", injury.id, injury.studentId);
    return injury;
  }

  async updateInjury(
    tenantId: string,
    injuryId: string,
    changes: { painLevel?: number; notes?: string },
  ) {
    const injury = this.injuries.find(
      (item) => item.tenantId === tenantId && item.id === injuryId,
    );
    if (!injury) throw new NotFoundError("Injury", injuryId);
    Object.assign(injury, changes, { updatedAt: new Date() });
    this.audit("update", "injuries", injury.id, injury.studentId);
    return injury;
  }

  async resolveInjury(tenantId: string, injuryId: string, resolvedAt: Date) {
    const injury = this.injuries.find(
      (item) => item.tenantId === tenantId && item.id === injuryId,
    );
    if (!injury) throw new NotFoundError("Injury", injuryId);
    Object.assign(injury, {
      status: "resolved" as const,
      resolvedAt,
      updatedAt: new Date(),
    });
    this.audit("update", "injuries", injury.id, injury.studentId);
    return injury;
  }

  async createRestriction(input: CreateHealthRestrictionInput) {
    const now = new Date();
    const restriction: HealthRestriction = {
      ...input,
      id: this.id("43000000", this.restrictions.length + 1),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.restrictions.push(restriction);
    this.audit(
      "insert",
      "health_restrictions",
      restriction.id,
      restriction.studentId,
    );
    return restriction;
  }

  async resolveRestriction(
    tenantId: string,
    restrictionId: string,
    resolvedAt: Date,
  ) {
    const restriction = this.restrictions.find(
      (item) => item.tenantId === tenantId && item.id === restrictionId,
    );
    if (!restriction)
      throw new NotFoundError("Health restriction", restrictionId);
    Object.assign(restriction, {
      status: "resolved" as const,
      resolvedAt,
      updatedAt: new Date(),
    });
    this.audit(
      "update",
      "health_restrictions",
      restriction.id,
      restriction.studentId,
    );
    return restriction;
  }

  async listHistory(tenantId: string, studentId: string) {
    return {
      conditions: this.conditions.filter(
        (item) => item.tenantId === tenantId && item.studentId === studentId,
      ),
      injuries: this.injuries.filter(
        (item) => item.tenantId === tenantId && item.studentId === studentId,
      ),
      restrictions: this.restrictions.filter(
        (item) => item.tenantId === tenantId && item.studentId === studentId,
      ),
    };
  }

  async listSessionParticipantHealth(
    tenantId: string,
    sessionId: string,
    onDate: string,
  ): Promise<SessionParticipantHealth[]> {
    return this.sessionParticipants
      .filter(
        (participant) =>
          participant.tenantId === tenantId &&
          participant.sessionId === sessionId,
      )
      .map((participant) => ({
        studentId: participant.studentId,
        studentName: participant.studentName,
        restrictions: this.restrictions.filter(
          (restriction) =>
            restriction.tenantId === tenantId &&
            restriction.studentId === participant.studentId &&
            restriction.status === "active" &&
            restriction.startsOn <= onDate &&
            (!restriction.endsOn || restriction.endsOn >= onDate),
        ),
      }));
  }

  async recordAccess(
    _tenantId: string,
    studentId: string,
    entityType: string,
    entityId: string,
  ) {
    this.audit("read", entityType, entityId, studentId);
  }
}
