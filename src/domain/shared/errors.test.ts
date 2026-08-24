import { describe, expect, it } from "vitest";
import {
  BusinessRuleViolationError,
  ConflictError,
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors";

describe("domain shared errors", () => {
  it("sets a distinct name and code per error type", () => {
    const cases: DomainError[] = [
      new NotFoundError("Student", "abc-123"),
      new BusinessRuleViolationError("Cannot cancel a completed session"),
      new ValidationError([{ path: "name", message: "Required" }]),
      new ConflictError("Version mismatch"),
      new UnauthorizedError(),
    ];

    for (const error of cases) {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(error.constructor.name);
      expect(error.code).toBeTruthy();
    }
  });

  it("carries structured issues on ValidationError", () => {
    const error = new ValidationError([
      { path: "email", message: "Invalid email" },
    ]);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.issues).toEqual([{ path: "email", message: "Invalid email" }]);
  });

  it("includes the entity and id in NotFoundError message", () => {
    const error = new NotFoundError("Student", "abc-123");
    expect(error.message).toBe("Student abc-123 not found");
  });
});
