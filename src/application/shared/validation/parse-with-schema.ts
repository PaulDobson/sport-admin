import type { ZodType } from "zod";
import { ValidationError } from "@/domain/shared/errors";

/**
 * Parses `input` against `schema`, throwing a domain `ValidationError` with
 * structured issues on failure. Use this at application-layer use case
 * boundaries instead of calling `schema.parse` directly, so every module
 * raises the same error shape for invalid input.
 */
export function parseWithSchema<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw new ValidationError(issues);
  }
  return result.data;
}
