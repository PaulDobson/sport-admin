import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type {
  HealthCondition,
  HealthRestriction,
  HealthSeverity,
  Injury,
} from "@/domain/evolution-health-attendance/health";
import type {
  CreateHealthConditionInput,
  CreateHealthRestrictionInput,
  CreateInjuryInput,
  HealthRepositoryPort,
} from "@/application/evolution-health-attendance/ports/health-repository-port";

interface HealthBaseRow {
  id: string;
  tenant_id: string;
  student_id: string;
  source: string;
  status: "active" | "resolved";
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface HealthConditionRow extends HealthBaseRow {
  name: string;
  notes: string | null;
  started_on: string | null;
}

interface InjuryRow extends HealthBaseRow {
  name: string;
  body_area: string | null;
  pain_level: number | null;
  notes: string | null;
  occurred_on: string | null;
}

interface HealthRestrictionRow extends HealthBaseRow {
  condition_id: string | null;
  injury_id: string | null;
  description: string;
  operational_action: string;
  severity: HealthSeverity;
  starts_on: string;
  ends_on: string | null;
}

function conditionFromRow(row: HealthConditionRow): HealthCondition {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentId: row.student_id,
    name: row.name,
    source: row.source,
    notes: row.notes ?? undefined,
    startedOn: row.started_on ?? undefined,
    status: row.status,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function injuryFromRow(row: InjuryRow): Injury {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentId: row.student_id,
    name: row.name,
    bodyArea: row.body_area ?? undefined,
    painLevel: row.pain_level ?? undefined,
    source: row.source,
    notes: row.notes ?? undefined,
    occurredOn: row.occurred_on ?? undefined,
    status: row.status,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function restrictionFromRow(row: HealthRestrictionRow): HealthRestriction {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentId: row.student_id,
    conditionId: row.condition_id ?? undefined,
    injuryId: row.injury_id ?? undefined,
    description: row.description,
    operationalAction: row.operational_action,
    severity: row.severity,
    source: row.source,
    startsOn: row.starts_on,
    endsOn: row.ends_on ?? undefined,
    status: row.status,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SupabaseHealthRepository implements HealthRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async createCondition(input: CreateHealthConditionInput) {
    const { data, error } = await this.client
      .from("health_conditions")
      .insert({
        tenant_id: input.tenantId,
        student_id: input.studentId,
        name: input.name,
        source: input.source,
        notes: input.notes,
        started_on: input.startedOn,
      })
      .select()
      .single();
    if (error || !data)
      throw error ?? new Error("Failed to create health condition");
    return conditionFromRow(data as HealthConditionRow);
  }

  async updateCondition(
    tenantId: string,
    conditionId: string,
    changes: { notes?: string; source?: string },
  ) {
    const { data, error } = await this.client
      .from("health_conditions")
      .update({ notes: changes.notes, source: changes.source })
      .eq("tenant_id", tenantId)
      .eq("id", conditionId)
      .select()
      .single();
    if (error || !data)
      throw error ?? new Error("Failed to update health condition");
    return conditionFromRow(data as HealthConditionRow);
  }

  async resolveCondition(
    tenantId: string,
    conditionId: string,
    resolvedAt: Date,
  ) {
    const { data, error } = await this.client
      .from("health_conditions")
      .update({ status: "resolved", resolved_at: resolvedAt.toISOString() })
      .eq("tenant_id", tenantId)
      .eq("id", conditionId)
      .select()
      .single();
    if (error || !data)
      throw error ?? new Error("Failed to resolve health condition");
    return conditionFromRow(data as HealthConditionRow);
  }

  async createInjury(input: CreateInjuryInput) {
    const { data, error } = await this.client
      .from("injuries")
      .insert({
        tenant_id: input.tenantId,
        student_id: input.studentId,
        name: input.name,
        body_area: input.bodyArea,
        pain_level: input.painLevel,
        source: input.source,
        notes: input.notes,
        occurred_on: input.occurredOn,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Failed to create injury");
    return injuryFromRow(data as InjuryRow);
  }

  async updateInjury(
    tenantId: string,
    injuryId: string,
    changes: { painLevel?: number; notes?: string },
  ) {
    const { data, error } = await this.client
      .from("injuries")
      .update({ pain_level: changes.painLevel, notes: changes.notes })
      .eq("tenant_id", tenantId)
      .eq("id", injuryId)
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Failed to update injury");
    return injuryFromRow(data as InjuryRow);
  }

  async resolveInjury(tenantId: string, injuryId: string, resolvedAt: Date) {
    const { data, error } = await this.client
      .from("injuries")
      .update({ status: "resolved", resolved_at: resolvedAt.toISOString() })
      .eq("tenant_id", tenantId)
      .eq("id", injuryId)
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Failed to resolve injury");
    return injuryFromRow(data as InjuryRow);
  }

  async createRestriction(input: CreateHealthRestrictionInput) {
    const { data, error } = await this.client
      .from("health_restrictions")
      .insert({
        tenant_id: input.tenantId,
        student_id: input.studentId,
        condition_id: input.conditionId,
        injury_id: input.injuryId,
        description: input.description,
        operational_action: input.operationalAction,
        severity: input.severity,
        source: input.source,
        starts_on: input.startsOn,
        ends_on: input.endsOn,
      })
      .select()
      .single();
    if (error || !data)
      throw error ?? new Error("Failed to create health restriction");
    return restrictionFromRow(data as HealthRestrictionRow);
  }

  async resolveRestriction(
    tenantId: string,
    restrictionId: string,
    resolvedAt: Date,
  ) {
    const { data, error } = await this.client
      .from("health_restrictions")
      .update({ status: "resolved", resolved_at: resolvedAt.toISOString() })
      .eq("tenant_id", tenantId)
      .eq("id", restrictionId)
      .select()
      .single();
    if (error || !data)
      throw error ?? new Error("Failed to resolve health restriction");
    return restrictionFromRow(data as HealthRestrictionRow);
  }

  async listHistory(tenantId: string, studentId: string) {
    const [conditions, injuries, restrictions] = await Promise.all([
      this.client
        .from("health_conditions")
        .select()
        .eq("tenant_id", tenantId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      this.client
        .from("injuries")
        .select()
        .eq("tenant_id", tenantId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
      this.client
        .from("health_restrictions")
        .select()
        .eq("tenant_id", tenantId)
        .eq("student_id", studentId)
        .order("starts_on", { ascending: false }),
    ]);
    if (conditions.error) throw conditions.error;
    if (injuries.error) throw injuries.error;
    if (restrictions.error) throw restrictions.error;
    return {
      conditions: (conditions.data as HealthConditionRow[]).map(
        conditionFromRow,
      ),
      injuries: (injuries.data as InjuryRow[]).map(injuryFromRow),
      restrictions: (restrictions.data as HealthRestrictionRow[]).map(
        restrictionFromRow,
      ),
    };
  }

  async listSessionParticipantHealth(
    tenantId: string,
    sessionId: string,
    onDate: string,
  ) {
    const { data: enrollmentData, error: enrollmentError } = await this.client
      .from("session_enrollments")
      .select("student_id, students!inner(full_name)")
      .eq("tenant_id", tenantId)
      .eq("session_id", sessionId)
      .eq("status", "confirmed");
    if (enrollmentError) throw enrollmentError;

    const enrollments = enrollmentData as unknown as Array<{
      student_id: string;
      students: { full_name: string };
    }>;
    if (enrollments.length === 0) return [];
    const studentIds = enrollments.map((enrollment) => enrollment.student_id);
    const { data: restrictionData, error: restrictionError } = await this.client
      .from("health_restrictions")
      .select()
      .eq("tenant_id", tenantId)
      .in("student_id", studentIds)
      .eq("status", "active")
      .lte("starts_on", onDate)
      .or(`ends_on.is.null,ends_on.gte.${onDate}`);
    if (restrictionError) throw restrictionError;
    const restrictions = (restrictionData as HealthRestrictionRow[]).map(
      restrictionFromRow,
    );

    return enrollments.map((enrollment) => ({
      studentId: enrollment.student_id,
      studentName: enrollment.students.full_name,
      restrictions: restrictions.filter(
        (restriction) => restriction.studentId === enrollment.student_id,
      ),
    }));
  }

  async recordAccess(
    tenantId: string,
    studentId: string,
    entityType: string,
    entityId: string,
  ) {
    const { error } = await this.client.rpc("record_sensitive_access", {
      target_tenant: tenantId,
      target_student: studentId,
      target_entity_type: entityType,
      target_entity_id: entityId,
    });
    if (error) throw error;
  }
}
