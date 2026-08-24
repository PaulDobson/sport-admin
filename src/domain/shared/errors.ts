/**
 * Base class for all domain-level errors. Application and presentation code
 * should catch `DomainError` (or a subclass) rather than generic `Error` to
 * decide how to map a failure to a user-facing response.
 */
export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** The requested entity does not exist, or is not visible to the current tenant/actor. */
export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super("NOT_FOUND", `${entity} ${id} not found`);
  }
}

/** Input failed a business validation rule (as opposed to a schema/type validation, see `ValidationError`). */
export class BusinessRuleViolationError extends DomainError {
  constructor(message: string) {
    super("BUSINESS_RULE_VIOLATION", message);
  }
}

/** Input failed shape/format/range validation. Carries structured issues for API responses. */
export class ValidationError extends DomainError {
  readonly issues: readonly { path: string; message: string }[];

  constructor(issues: readonly { path: string; message: string }[]) {
    super("VALIDATION_ERROR", "Input validation failed");
    this.issues = issues;
  }
}

/** The action conflicts with the current state of the resource (e.g. duplicate, stale version). */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super("CONFLICT", message);
  }
}

/** The actor is authenticated but not authorized to perform this action on this resource. */
export class UnauthorizedError extends DomainError {
  constructor(message = "Not authorized to perform this action") {
    super("UNAUTHORIZED", message);
  }
}
