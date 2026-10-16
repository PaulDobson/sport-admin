import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/domain/shared/errors";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabaseClassTemplateAdministrationRepository } from "./supabase-class-template-administration-repository";

const tenantId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const fetchMock = vi.fn<typeof fetch>();
const repository = new SupabaseClassTemplateAdministrationRepository(createClient<Database>("https://test.supabase.co", "test-anon-key", {
  global: { fetch: fetchMock },
  auth: { persistSession: false, autoRefreshToken: false },
}));
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
beforeEach(() => fetchMock.mockReset());

describe("Supabase class template administration", () => {
  it("fetches every catalog batch instead of silently truncating at the API row limit", async () => {
    const row = { id, name: "Yoga", capacity: 16, discipline_name: "Yoga", schedule_count: 0, session_count: 0 };
    fetchMock.mockResolvedValueOnce(response(Array.from({ length: 500 }, (_, index) => ({ ...row, id: String(index) }))))
      .mockResolvedValueOnce(response([{ ...row, id: "last" }]));
    const result = await repository.list(tenantId);
    expect(result).toHaveLength(501);
    expect(result[500].id).toBe("last");
    const url = new URL(String(fetchMock.mock.calls[1][0]));
    expect(url.searchParams.get("offset")).toBe("500");
    expect(url.searchParams.get("limit")).toBe("500");
  });
  it("uses an authorized tenant-scoped RPC for complete usage counts", async () => {
    fetchMock.mockResolvedValueOnce(response([{ id, name: "Yoga", capacity: 16, discipline_name: "Yoga", schedule_count: 2, session_count: 4 }]));
    expect(await repository.list(tenantId)).toEqual([{ id, name: "Yoga", capacity: 16, disciplineName: "Yoga", scheduleCount: 2, sessionCount: 4 }]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/rpc/list_class_templates_for_administration");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ target_tenant_id: tenantId });
  });
  it("scopes mutations by tenant, ID and active status without changing discipline or sessions", async () => {
    fetchMock.mockResolvedValueOnce(response({ id })).mockResolvedValueOnce(response({ id }));
    await repository.update({ tenantId, id, name: "Yoga inicial", capacity: 12 });
    await repository.delete({ tenantId, id });
    for (const index of [0, 1]) {
      const url = new URL(String(fetchMock.mock.calls[index][0]));
      expect(url.pathname).toBe("/rest/v1/class_templates");
      expect(url.searchParams.get("tenant_id")).toBe(`eq.${tenantId}`);
      expect(url.searchParams.get("id")).toBe(`eq.${id}`);
      expect(url.searchParams.get("status")).toBe("eq.active");
    }
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ name: "Yoga inicial", capacity: 12 });
    expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
  });
  it.each(["23503", "23001"])("maps concurrent references (%s) to a safe conflict", async (code) => {
    fetchMock.mockResolvedValueOnce(response({ code, message: "referenced" }, 409));
    await expect(repository.delete({ tenantId, id })).rejects.toThrow("La programación se ha conservado");
  });
  it.each(["update", "delete"] as const)("rejects an invisible or missing row on %s", async (operation) => {
    fetchMock.mockResolvedValueOnce(response([]));
    const result = operation === "update" ? repository.update({ tenantId, id, name: "Yoga", capacity: 16 }) : repository.delete({ tenantId, id });
    await expect(result).rejects.toBeInstanceOf(DomainError);
  });
  it("does not silently treat a missing catalog as empty", async () => {
    fetchMock.mockResolvedValueOnce(response(null));
    await expect(repository.list(tenantId)).rejects.toThrow("Missing class administration catalog");
  });
  it("propagates unexpected database errors", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "42501", message: "denied" }, 403));
    await expect(repository.list(tenantId)).rejects.toMatchObject({ code: "42501" });
  });
});
