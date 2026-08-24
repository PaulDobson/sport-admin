import { describe, expect, it } from "vitest";
import { FakeMetricRepository } from "../testing/fake-metric-repository";
import { createMetricDefinition } from "./create-metric-definition";
import { getMetricHistory } from "./get-metric-history";
import { recordMetricEvaluation } from "./record-metric-evaluation";

const ids = {
  tenantId: "20000000-0000-4000-8000-000000000001",
  studentId: "20000000-0000-4000-8000-000000000002",
  authorMembershipId: "20000000-0000-4000-8000-000000000003",
};

describe("getMetricHistory", () => {
  it("preserves evaluations and returns the newest first", async () => {
    const metrics = new FakeMetricRepository();
    await createMetricDefinition(
      {
        ...ids,
        slug: "load",
        name: "Load",
        category: "strength",
        valueType: "numeric",
        unit: "kg",
        validationRules: { min: 0 },
      },
      { metrics },
    );
    await recordMetricEvaluation(
      {
        ...ids,
        evaluatedAt: "2026-07-01T10:00:00.000Z",
        values: { load: 70 },
        notes: "Baseline",
      },
      { metrics },
    );
    await recordMetricEvaluation(
      {
        ...ids,
        evaluatedAt: "2026-08-01T10:00:00.000Z",
        values: { load: 80 },
        notes: "Progress check",
      },
      { metrics },
    );

    const history = await getMetricHistory(ids, { metrics });

    expect(history).toHaveLength(2);
    expect(history.map((evaluation) => evaluation.notes)).toEqual([
      "Progress check",
      "Baseline",
    ]);
    expect(history[0]).toMatchObject({
      authorMembershipId: ids.authorMembershipId,
      evaluatedAt: new Date("2026-08-01T10:00:00.000Z"),
      values: { load: 80 },
    });
  });
});
