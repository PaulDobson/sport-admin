import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { AuthPort } from "../ports/auth-port";

const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export interface RequestPasswordResetDeps {
  auth: AuthPort;
}

export async function requestPasswordReset(
  input: { email: string },
  deps: RequestPasswordResetDeps,
): Promise<void> {
  const parsed = parseWithSchema(requestPasswordResetSchema, input);
  await deps.auth.requestPasswordReset(parsed.email);
}
