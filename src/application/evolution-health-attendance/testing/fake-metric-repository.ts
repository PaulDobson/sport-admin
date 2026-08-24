import type {
  MetricDefinition,
  MetricEvaluation,
} from "@/domain/evolution-health-attendance/metric";
import type {
  CreateMetricDefinitionInput,
  CreateMetricEvaluationInput,
  MetricRepositoryPort,
} from "../ports/metric-repository-port";

export class FakeMetricRepository implements MetricRepositoryPort {
  readonly definitions: MetricDefinition[] = [];
  readonly evaluations: MetricEvaluation[] = [];

  async createDefinition(input: CreateMetricDefinitionInput) {
    const now = new Date();
    const definition: MetricDefinition = {
      ...input,
      id: `metric-${this.definitions.length + 1}`,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.definitions.push(definition);
    return definition;
  }

  async findActiveDefinitions(tenantId: string, slugs: string[]) {
    return this.definitions.filter(
      (definition) =>
        definition.tenantId === tenantId &&
        definition.status === "active" &&
        slugs.includes(definition.slug),
    );
  }

  async createEvaluation(input: CreateMetricEvaluationInput) {
    const evaluation: MetricEvaluation = {
      ...input,
      id: `evaluation-${this.evaluations.length + 1}`,
      createdAt: new Date(),
    };
    this.evaluations.push(evaluation);
    return evaluation;
  }

  async listEvaluationHistory(tenantId: string, studentId: string) {
    return this.evaluations
      .filter(
        (evaluation) =>
          evaluation.tenantId === tenantId &&
          evaluation.studentId === studentId,
      )
      .sort(
        (left, right) =>
          right.evaluatedAt.getTime() - left.evaluatedAt.getTime(),
      );
  }
}
