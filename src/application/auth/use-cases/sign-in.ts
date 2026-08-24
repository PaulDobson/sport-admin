import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { AuthPort } from "../ports/auth-port";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});

export async function signIn(
  input: { email: string; password: string },
  deps: { auth: AuthPort },
): Promise<{ userId: string }> {
  const parsed = parseWithSchema(signInSchema, input);
  return deps.auth.signInWithPassword(parsed);
}
