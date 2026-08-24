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
  valueType: MetricValueType;
  unit?: string;
  validationRules: MetricValidationRules;
}

export interface CreateMetricEvaluationInput {
  tenantId: string;
  studentId: string;
  authorMembershipId: string;
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
  createEvaluation(
    input: CreateMetricEvaluationInput,
  ): Promise<MetricEvaluation>;
  listEvaluationHistory(
    tenantId: string,
    studentId: string,
  ): Promise<MetricEvaluation[]>;
}
