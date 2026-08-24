import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import { filterMembershipFollowUps } from "@/domain/instructor-finance/membership-follow-up";
import type { MembershipFollowUpRepositoryPort } from "../ports/membership-follow-up-repository-port";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const inputSchema = z
  .object({
    tenantId: z.string().uuid(),
    from: dateSchema,
    to: dateSchema,
    status: z
      .enum(["active", "paused", "past_due", "expired", "cancelled"])
      .optional(),
  })
  .refine((value) => value.from <= value.to, {
    message: "The start date must not be after the end date",
    path: ["to"],
  });

export async function getMembershipFollowUps(
  input: z.input<typeof inputSchema>,
  deps: { membershipFollowUps: MembershipFollowUpRepositoryPort },
) {
  const parsed = parseWithSchema(inputSchema, input);
  const accounts = await deps.membershipFollowUps.listByTenant(parsed.tenantId);
  return filterMembershipFollowUps(accounts, parsed);
}
