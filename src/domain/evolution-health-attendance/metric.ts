export type MetricValueType =
  | "numeric"
  | "percentage"
  | "duration"
  | "selection"
  | "object";

export type MetricValidationRules = {
  min?: number;
  max?: number;
  options?: string[];
  requiredFields?: string[];
};

export interface MetricDefinition {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  category: string;
  valueType: MetricValueType;
  unit?: string;
  validationRules: MetricValidationRules;
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricEvaluation {
  id: string;
  tenantId: string;
  studentId: string;
  authorMembershipId: string;
  evaluatedAt: Date;
  values: Record<string, unknown>;
  notes?: string;
  createdAt: Date;
}

export function metricValueError(
  definition: MetricDefinition,
  value: unknown,
): string | undefined {
  const { min, max } = definition.validationRules;

  if (
    definition.valueType === "numeric" ||
    definition.valueType === "percentage" ||
    definition.valueType === "duration"
  ) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "Value must be a finite number";
    }
    if (definition.valueType === "percentage" && (value < 0 || value > 100)) {
      return "Percentage must be between 0 and 100";
    }
    if (definition.valueType === "duration" && value < 0) {
      return "Duration cannot be negative";
    }
    if (min !== undefined && value < min) {
      return `Value must be at least ${min}`;
    }
    if (max !== undefined && value > max) {
      return `Value must be at most ${max}`;
    }
    return undefined;
  }

  if (definition.valueType === "selection") {
    if (
      typeof value !== "string" ||
      !definition.validationRules.options?.includes(value)
    ) {
      return "Value must be one of the configured options";
    }
    return undefined;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "Value must be an object";
  }
  const objectValue = value as Record<string, unknown>;
  const missingField = definition.validationRules.requiredFields?.find(
    (field) => !(field in objectValue),
  );
  return missingField
    ? `Required field is missing: ${missingField}`
    : undefined;
}
