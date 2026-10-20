import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, DomainError } from "@/domain/shared/errors";
import type { Database } from "@/infrastructure/supabase/database.types";
import { SupabaseDisciplineAdministrationRepository } from "./supabase-discipline-administration-repository";

const tenantId = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const row = { id, tenant_id: tenantId, name: "Yoga", status: "active", created_at: "2026-10-01T12:00:00Z" };
const fetchMock = vi.fn<typeof fetch>();
const client = createClient<Database>("https://test.supabase.co", "test-anon-key", {
  global: { fetch: fetchMock },
  auth: { persistSession: false, autoRefreshToken: false },
});
const repository = new SupabaseDisciplineAdministrationRepository(client);

function response(body: unknown, count?: number, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...(count === undefined ? {} : { "content-range": `0-0/${count}` }),
    },
  });
}
function url(index: number) {
  return new URL(String(fetchMock.mock.calls[index][0]));
}
beforeEach(() => fetchMock.mockReset());

describe("Supabase discipline administration", () => {
  it("lists a tenant-scoped page with literal search and template counts", async () => {
    fetchMock.mockResolvedValueOnce(response(null, 8))
      .mockResolvedValueOnce(response(null, 3))
      .mockResolvedValueOnce(response([{ ...row, class_templates: [{ count: 2 }] }], 11));
    const result = await repository.list({ tenantId, search: "Yoga%_", status: "all", page: 2, pageSize: 10 });
    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 11, activeCount: 8, archivedCount: 3, rows: [{ id, templateCount: 2, status: "active" }] });
    for (const index of [0, 1, 2]) expect(url(index).searchParams.get("tenant_id")).toBe(`eq.${tenantId}`);
    expect(url(2).searchParams.get("name")).toBe("ilike.%Yoga\\%\\_%");
    expect(url(2).searchParams.get("offset")).toBe("10");
    expect(url(2).searchParams.get("limit")).toBe("10");
    expect(url(2).searchParams.get("select")).toContain("class_templates(count)");
    expect(url(2).searchParams.get("order")).toBe("name.asc,id.asc");
  });
  it("filters status and refetches the last page after deletion", async () => {
    fetchMock.mockResolvedValueOnce(response(null, 2))
      .mockResolvedValueOnce(response(null, 0))
      .mockResolvedValueOnce(response([], 2))
      .mockResolvedValueOnce(response([{ ...row, class_templates: [{ count: 0 }] }], 2));
    const result = await repository.list({ tenantId, search: "", status: "active", page: 20, pageSize: 10 });
    expect(result.page).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(url(2).searchParams.get("status")).toBe("eq.active");
    expect(url(3).searchParams.get("offset")).toBe("0");
  });
  it("persists only allowed fields and scopes update and delete by tenant", async () => {
    fetchMock.mockResolvedValueOnce(response(row))
      .mockResolvedValueOnce(response({ ...row, status: "archived" }))
      .mockResolvedValueOnce(response({ id }));
    await repository.createDiscipline({ tenantId, name: "Yoga" });
    await repository.update({ tenantId, id, name: "Yoga", status: "archived" });
    await repository.delete({ tenantId, id });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ tenant_id: tenantId, name: "Yoga" });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ name: "Yoga", status: "archived" });
    for (const index of [1, 2]) {
      expect(url(index).searchParams.get("tenant_id")).toBe(`eq.${tenantId}`);
      expect(url(index).searchParams.get("id")).toBe(`eq.${id}`);
    }
    expect(fetchMock.mock.calls[2][1]?.method).toBe("DELETE");
  });
  it("maps duplicate names and concurrent class references to actionable conflicts", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "23505", message: "duplicate" }, undefined, 409));
    await expect(repository.createDiscipline({ tenantId, name: "Yoga" })).rejects.toThrow(ConflictError);
    fetchMock.mockResolvedValueOnce(response({ code: "23503", message: "referenced" }, undefined, 409));
    await expect(repository.delete({ tenantId, id })).rejects.toThrow("tiene clases asociadas");
  });
  it.each(["update", "delete"] as const)("does not report success when %s affects no visible row", async (operation) => {
    fetchMock.mockResolvedValueOnce(response([]));
    const mutation = operation === "delete"
      ? repository.delete({ tenantId, id })
      : repository.update({ tenantId, id, name: "Yoga", status: "active" });
    await expect(mutation).rejects.toThrow(DomainError);
  });
  it("propagates unexpected database errors", async () => {
    fetchMock.mockResolvedValueOnce(response({ code: "42501", message: "permission denied" }, undefined, 403));
    await expect(repository.delete({ tenantId, id })).rejects.toMatchObject({ code: "42501" });
  });
});
