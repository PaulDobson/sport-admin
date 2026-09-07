import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import type { Json } from "@/infrastructure/supabase/database.types";
import type {
  MetricDefinition,
  MetricEvaluation,
  MetricValidationRules,
  MetricValueType,
} from "@/domain/evolution-health-attendance/metric";
import type {
  CreateMetricDefinitionInput,
  CreateMetricEvaluationInput,
  MetricRepositoryPort,
} from "@/application/evolution-health-attendance/ports/metric-repository-port";

interface MetricDefinitionRow {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  category: string;
  value_type: MetricValueType;
  unit: string | null;
  validation_rules: MetricValidationRules;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

interface MetricEvaluationRow {
  id: string;
  tenant_id: string;
  student_id: string;
  author_membership_id: string;
  evaluated_at: string;
  values: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}

function toEvaluation(row: MetricEvaluationRow): MetricEvaluation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentId: row.student_id,
    authorMembershipId: row.author_membership_id,
    evaluatedAt: new Date(row.evaluated_at),
    values: row.values,
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

function toDefinition(row: MetricDefinitionRow): MetricDefinition {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    valueType: row.value_type,
    unit: row.unit ?? undefined,
    validationRules: row.validation_rules,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SupabaseMetricRepository implements MetricRepositoryPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async createDefinition(input: CreateMetricDefinitionInput) {
    const { data, error } = await this.client
      .from("metric_definitions")
      .insert({
        tenant_id: input.tenantId,
        slug: input.slug,
        name: input.name,
        category: input.category,
        value_type: input.valueType,
        unit: input.unit,
        validation_rules: input.validationRules,
      })
      .select()
      .single();
    if (error || !data)
      throw error ?? new Error("Failed to create metric definition");
    return toDefinition(data as MetricDefinitionRow);
  }

  async findActiveDefinitions(tenantId: string, slugs: string[]) {
    const { data, error } = await this.client
      .from("metric_definitions")
      .select()
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .in("slug", slugs);
    if (error) throw error;
    return (data as MetricDefinitionRow[]).map(toDefinition);
  }

  async createEvaluation(input: CreateMetricEvaluationInput) {
    const { data, error } = await this.client
      .from("metric_evaluations")
      .insert({
        tenant_id: input.tenantId,
        student_id: input.studentId,
        author_membership_id: input.authorMembershipId,
        evaluated_at: input.evaluatedAt.toISOString(),
        values: input.values as Json,
        notes: input.notes,
      })
      .select()
      .single();
    if (error || !data)
      throw error ?? new Error("Failed to record metric evaluation");
    return toEvaluation(data as MetricEvaluationRow);
  }

  async listEvaluationHistory(tenantId: string, studentId: string) {
    const { data, error } = await this.client
      .from("metric_evaluations")
      .select()
      .eq("tenant_id", tenantId)
      .eq("student_id", studentId)
      .order("evaluated_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as MetricEvaluationRow[]).map(toEvaluation);
  }
}
