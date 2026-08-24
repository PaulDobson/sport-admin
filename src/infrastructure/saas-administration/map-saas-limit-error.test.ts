import { describe, expect, it } from "vitest";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { throwMappedSaasLimitError } from "./map-saas-limit-error";

describe("throwMappedSaasLimitError", () => {
  it("maps controlled student and user limit violations", () => {
    expect(() =>
      throwMappedSaasLimitError({
        code: "P0001",
        message: "SaaS student limit reached (10/10). Upgrade the plan.",
      }),
    ).toThrow(BusinessRuleViolationError);
    expect(() =>
      throwMappedSaasLimitError({
        code: "P0001",
        message: "SaaS user limit reached (2/2). Upgrade the plan.",
      }),
    ).toThrow("Límite de usuarios alcanzado (2/2)");
  });

  it("preserves unrelated database errors", () => {
    const error = { code: "23505", message: "duplicate" };
    expect(() => throwMappedSaasLimitError(error)).toThrow(error);
  });
});
