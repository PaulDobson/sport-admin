import { z } from "zod";
import type { ProgrammingBatchPort } from "@/application/instructor-operations/ports/programming-batch-port";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import { BusinessRuleViolationError } from "@/domain/shared/errors";

const previewSchema = z.object({
  newCount: z.number().int().nonnegative(),
  existingCount: z.number().int().nonnegative(),
  occurrences: z.array(
    z.object({
      startsAt: z.string(),
      endsAt: z.string(),
      locationId: z.string().uuid(),
    }),
  ),
  conflicts: z.array(z.object({ message: z.string() })),
  fingerprint: z.string(),
});

export class SupabaseProgrammingBatchRepository implements ProgrammingBatchPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}

  async execute(input: Parameters<ProgrammingBatchPort["execute"]>[0]) {
    const { data, error } = await this.client.rpc("program_class_batch", {
      target_tenant_id: input.tenantId,
      target_instructor_membership_id: input.instructorMembershipId,
      target_programming: input.programming,
      target_intent: input.intent,
      target_commit: input.commit,
      target_preview_fingerprint: input.previewFingerprint ?? undefined,
    });
    if (error) {
      if (["22023", "23514", "P0002", "42501"].includes(error.code)) {
        throw new BusinessRuleViolationError(error.message);
      }
      throw error;
    }
    return previewSchema.parse(data);
  }
}
