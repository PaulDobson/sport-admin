import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { ProfileRepositoryPort } from "../ports/profile-repository-port";

const profileSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  avatarUrl: z
    .union([z.string().url().max(500), z.literal(""), z.null()])
    .transform((value) => (value === "" ? null : value)),
});

export async function updateProfile(
  input: z.input<typeof profileSchema>,
  deps: { profiles: ProfileRepositoryPort },
) {
  const parsed = parseWithSchema(profileSchema, input);
  return deps.profiles.updateByUserId(parsed.userId, {
    fullName: parsed.fullName,
    avatarUrl: parsed.avatarUrl,
  });
}
