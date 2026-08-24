import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import { FakeMetricRepository } from "../testing/fake-metric-repository";
import { createMetricDefinition } from "./create-metric-definition";
import { recordMetricEvaluation } from "./record-metric-evaluation";

const ids = {
  tenantId: "10000000-0000-4000-8000-000000000001",
  studentId: "10000000-0000-4000-8000-000000000002",
  authorMembershipId: "10000000-0000-4000-8000-000000000003",
};

describe("metric definitions and evaluations", () => {
  it("accepts numeric, percentage, duration, selection, and object values", async () => {
    const metrics = new FakeMetricRepository();
    await Promise.all([
      createMetricDefinition(
        {
          ...ids,
          slug: "load",
          name: "Load",
          category: "strength",
          valueType: "numeric",
          unit: "kg",
          validationRules: { min: 0, max: 300 },
        },
        { metrics },
      ),
      createMetricDefinition(
        {
          ...ids,
          slug: "accuracy",
          name: "Accuracy",
          category: "skill",
          valueType: "percentage",
          validationRules: {},
        },
        { metrics },
      ),
      createMetricDefinition(
        {
          ...ids,
          slug: "plank",
          name: "Plank",
          category: "endurance",
          valueType: "duration",
          unit: "seconds",
          validationRules: { max: 600 },
        },
        { metrics },
      ),
      createMetricDefinition(
        {
          ...ids,
          slug: "effort",
          name: "Effort",
          category: "perception",
          valueType: "selection",
          validationRules: { options: ["low", "medium", "high"] },
        },
        { metrics },
      ),
      createMetricDefinition(
        {
          ...ids,
          slug: "splits",
          name: "Splits",
          category: "speed",
          valueType: "object",
          validationRules: { requiredFields: ["first", "second"] },
        },
        { metrics },
      ),
    ]);

    await expect(
      recordMetricEvaluation(
        {
          ...ids,
          evaluatedAt: "2026-08-22T10:00:00.000Z",
          values: {
            load: 80,
            accuracy: 92,
            plank: 120,
            effort: "medium",
            splits: { first: 12.1, second: 11.8 },
          },
        },
        { metrics },
      ),
    ).resolves.toMatchObject({ values: { load: 80, accuracy: 92 } });
  });

  it.each([
    ["load", "heavy", "finite number"],
    ["load", 301, "at most 300"],
    ["accuracy", 101, "between 0 and 100"],
    ["plank", -1, "cannot be negative"],
    ["effort", "extreme", "configured options"],
    ["splits", { first: 12.1 }, "Required field is missing"],
  ])("rejects incompatible %s values", async (slug, value, message) => {
    const metrics = new FakeMetricRepository();
    const definitions = {
      load: {
        valueType: "numeric" as const,
        validationRules: { min: 0, max: 300 },
      },
      accuracy: { valueType: "percentage" as const, validationRules: {} },
      plank: { valueType: "duration" as const, validationRules: {} },
      effort: {
        valueType: "selection" as const,
        validationRules: { options: ["low", "medium", "high"] },
      },
      splits: {
        valueType: "object" as const,
        validationRules: { requiredFields: ["first", "second"] },
      },
    };
    await createMetricDefinition(
      {
        ...ids,
        slug,
        name: slug,
        category: "test",
        ...definitions[slug as keyof typeof definitions],
      },
      { metrics },
    );

    await expect(
      recordMetricEvaluation(
        { ...ids, evaluatedAt: new Date(), values: { [slug]: value } },
        { metrics },
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      issues: [
        expect.objectContaining({
          path: `values.${slug}`,
          message: expect.stringContaining(message),
        }),
      ],
    });
    expect(metrics.evaluations).toHaveLength(0);
  });

  it("rejects values without an active definition", async () => {
    const metrics = new FakeMetricRepository();

    await expect(
      recordMetricEvaluation(
        { ...ids, evaluatedAt: new Date(), values: { unknown: 10 } },
        { metrics },
      ),
    ).rejects.toThrow(ValidationError);
  });
});
