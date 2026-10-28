import type {
  MetricDefinition,
  MetricEvaluation,
} from "@/domain/evolution-health-attendance/metric";
import type {
  CreateMetricDefinitionInput,
  CreateMetricEvaluationInput,
  UpdateMetricEvaluationInput,
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
      evaluationType: input.evaluationType ?? "custom",
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

  async listAllActiveDefinitions(tenantId: string) {
    return this.definitions.filter(
      (definition) =>
        definition.tenantId === tenantId && definition.status === "active",
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

  async seedDefaultDefinitions(_tenantId: string): Promise<void> {
    // No-op in tests — seed manually via createDefinition
  }

  async deleteEvaluation(_tenantId: string, evaluationId: string) {
    const idx = this.evaluations.findIndex((e) => e.id === evaluationId);
    if (idx !== -1) this.evaluations.splice(idx, 1);
  }

  async updateEvaluation(input: UpdateMetricEvaluationInput) {
    const idx = this.evaluations.findIndex(
      (e) => e.id === input.evaluationId && e.tenantId === input.tenantId,
    );
    if (idx === -1) throw new Error("Evaluation not found");
    const updated: MetricEvaluation = {
      ...this.evaluations[idx],
      evaluatedAt: input.evaluatedAt,
      values: input.values,
      notes: input.notes,
    };
    this.evaluations[idx] = updated;
    return updated;
  }
}
