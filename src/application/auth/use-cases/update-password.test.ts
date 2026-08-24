import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import { FakeAuthPort } from "../testing/fakes";
import { updatePassword } from "./update-password";

describe("updatePassword", () => {
  it("updates a valid matching password", async () => {
    const auth = new FakeAuthPort();

    await updatePassword(
      { password: "new-secret", passwordConfirmation: "new-secret" },
      { auth },
    );

    expect(auth.passwordUpdateCalls).toEqual(["new-secret"]);
  });

  it("rejects mismatched passwords before calling AuthPort", async () => {
    const auth = new FakeAuthPort();

    await expect(
      updatePassword(
        { password: "new-secret", passwordConfirmation: "other-secret" },
        { auth },
      ),
    ).rejects.toThrow(ValidationError);
    expect(auth.passwordUpdateCalls).toHaveLength(0);
  });
});
