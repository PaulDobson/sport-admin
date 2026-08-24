import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { AuthPort } from "../ports/auth-port";

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must have at least 8 characters"),
    passwordConfirmation: z.string(),
  })
  .refine((input) => input.password === input.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
  });

export async function updatePassword(
  input: { password: string; passwordConfirmation: string },
  deps: { auth: AuthPort },
): Promise<void> {
  const parsed = parseWithSchema(updatePasswordSchema, input);
  await deps.auth.updatePassword(parsed.password);
}
