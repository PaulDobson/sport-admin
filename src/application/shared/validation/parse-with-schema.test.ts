import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ValidationError } from "@/domain/shared/errors";
import { parseWithSchema } from "./parse-with-schema";

const studentNameSchema = z.object({ fullName: z.string().min(1) });

describe("parseWithSchema", () => {
  it("returns the parsed value when input is valid", () => {
    const result = parseWithSchema(studentNameSchema, {
      fullName: "Ada Lovelace",
    });
    expect(result).toEqual({ fullName: "Ada Lovelace" });
  });

  it("throws a domain ValidationError with structured issues on invalid input", () => {
    expect(() => parseWithSchema(studentNameSchema, { fullName: "" })).toThrow(
      ValidationError,
    );

    try {
      parseWithSchema(studentNameSchema, { fullName: "" });
      throw new Error("expected parseWithSchema to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).issues).toEqual([
        { path: "fullName", message: expect.any(String) },
      ]);
    }
  });
});
