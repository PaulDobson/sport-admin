import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import { registerInstructor } from "./register-instructor";
import { FakeAuthPort } from "../testing/fakes";

describe("registerInstructor", () => {
  it("delegates to AuthPort.signUp with normalized input", async () => {
    const auth = new FakeAuthPort();

    const result = await registerInstructor(
      {
        email: " Ada@Example.com ",
        password: "super-secret",
        fullName: "  Ada Lovelace  ",
      },
      { auth },
    );

    expect(result).toEqual({ userId: "user-1" });
    expect(auth.signUpCalls).toEqual([
      {
        email: "ada@example.com",
        password: "super-secret",
        fullName: "Ada Lovelace",
      },
    ]);
  });

  it("rejects a short password before calling AuthPort", async () => {
    const auth = new FakeAuthPort();

    await expect(
      registerInstructor(
        { email: "ada@example.com", password: "short", fullName: "Ada" },
        { auth },
      ),
    ).rejects.toThrow(ValidationError);
    expect(auth.signUpCalls).toHaveLength(0);
  });
});
