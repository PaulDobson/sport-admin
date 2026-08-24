import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { AuthPort } from "../ports/auth-port";

const registerInstructorSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().min(1, "Full name is required"),
});

export type RegisterInstructorInput = z.infer<typeof registerInstructorSchema>;

export interface RegisterInstructorDeps {
  auth: AuthPort;
}

/**
 * Registers a new instructor account. Supabase Auth sends a verification email;
 * the account has no tenant until the user completes onboarding after verifying.
 */
export async function registerInstructor(
  input: RegisterInstructorInput,
  deps: RegisterInstructorDeps,
): Promise<{ userId: string }> {
  const parsed = parseWithSchema(registerInstructorSchema, input);
  return deps.auth.signUp(parsed);
}
