import { describe, expect, it, vi } from "vitest";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { SupabaseProgrammingBatchRepository } from "./supabase-programming-batch-repository";

const input = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  instructorMembershipId: "22222222-2222-4222-8222-222222222222",
  programming: {
    operationId: "33333333-3333-4333-8333-333333333333",
    classTemplateId: "44444444-4444-4444-8444-444444444444",
    timezone: "America/Santiago", mode: "weekly" as const,
    fromDate: "2030-01-07", throughDate: "2030-01-14",
    waitlistEnabled: true, allowConflict: false,
    slots: [{ dayOfWeek: 1, startsAt: "09:00", endsAt: "10:00", locationId: "55555555-5555-4555-8555-555555555555" }],
  },
  intent: "publish" as const,
  commit: false,
};
const preview = { newCount: 2, existingCount: 0, occurrences: [], conflicts: [], fingerprint: "review" };
function repository(result: unknown) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { rpc, repository: new SupabaseProgrammingBatchRepository({ rpc } as unknown as SupabaseDatabaseClient) };
}
describe("Supabase programming transaction", () => {
  it("uses exactly one RPC for preview and forwards trusted scope and payload", async () => {
    const subject = repository({ data: preview, error: null });
    expect(await subject.repository.execute(input)).toEqual(preview);
    expect(subject.rpc).toHaveBeenCalledTimes(1);
    expect(subject.rpc).toHaveBeenCalledWith("program_class_batch", {
      target_tenant_id: input.tenantId, target_instructor_membership_id: input.instructorMembershipId,
      target_programming: input.programming, target_intent: "publish",
      target_commit: false, target_preview_fingerprint: null,
    });
  });
  it("uses the same transaction endpoint for commit and forwards review fingerprint", async () => {
    const subject = repository({ data: preview, error: null });
    await subject.repository.execute({ ...input, commit: true, previewFingerprint: "review" });
    expect(subject.rpc).toHaveBeenCalledWith("program_class_batch", expect.objectContaining({ target_commit: true, target_preview_fingerprint: "review" }));
  });
  it.each(["22023", "23514", "P0002", "42501"])("preserves safe transactional validation details (%s)", async (code) => {
    const subject = repository({ data: null, error: { code, message: "Revisa nuevamente la programación." } });
    await expect(subject.repository.execute(input)).rejects.toEqual(new BusinessRuleViolationError("Revisa nuevamente la programación."));
  });
  it("does not mask unexpected database failures", async () => {
    const error = { code: "XX000", message: "internal failure" };
    await expect(repository({ data: null, error }).repository.execute(input)).rejects.toBe(error);
  });
  it("rejects malformed database results instead of reporting success", async () => {
    await expect(repository({ data: { newCount: -1 }, error: null }).repository.execute(input)).rejects.toThrow();
  });
});
