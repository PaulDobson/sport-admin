import type {
  MetricDefinition,
  MetricEvaluation,
  MetricValidationRules,
  MetricValueType,
} from "@/domain/evolution-health-attendance/metric";

export interface CreateMetricDefinitionInput {
  tenantId: string;
  slug: string;
  name: string;
  category: string;
  evaluationType: "body_composition" | "strength" | "cardio" | "custom";
  valueType: MetricValueType;
  unit?: string;
  validationRules: MetricValidationRules;
  timeWindowSeconds?: number;
}

export interface CreateMetricEvaluationInput {
  tenantId: string;
  studentId: string;
  authorMembershipId: string;
  evaluatedAt: Date;
  values: Record<string, unknown>;
  notes?: string;
}

export interface UpdateMetricEvaluationInput {
  tenantId: string;
  evaluationId: string;
  evaluatedAt: Date;
  values: Record<string, unknown>;
  notes?: string;
}

export interface MetricRepositoryPort {
  createDefinition(
    input: CreateMetricDefinitionInput,
  ): Promise<MetricDefinition>;
  findActiveDefinitions(
    tenantId: string,
    slugs: string[],
  ): Promise<MetricDefinition[]>;
  listAllActiveDefinitions(tenantId: string): Promise<MetricDefinition[]>;
  createEvaluation(
    input: CreateMetricEvaluationInput,
  ): Promise<MetricEvaluation>;
  updateEvaluation(
    input: UpdateMetricEvaluationInput,
  ): Promise<MetricEvaluation>;
  listEvaluationHistory(
    tenantId: string,
    studentId: string,
  ): Promise<MetricEvaluation[]>;
  seedDefaultDefinitions(tenantId: string): Promise<void>;
  deleteEvaluation(tenantId: string, evaluationId: string): Promise<void>;
}
