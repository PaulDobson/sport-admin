import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseStudentRepository } from "./supabase-student-repository";

describe("SupabaseStudentRepository", () => {
  it("queries paginated student administration rows scoped to tenant", async () => {
    const range = vi.fn().mockResolvedValue({
      data: [
        {
          id: "student-1",
          tenant_id: "tenant-1",
          full_name: "Ana Bravo",
          photo_url: null,
          birth_date: "1995-01-01",
          status: "active",
          archived_at: null,
          created_at: "2026-09-04T00:00:00.000Z",
        },
      ],
      error: null,
      count: 1,
    });
    const order = vi.fn(() => ({ range }));
    const ilike = vi.fn(() => ({ order }));
    const statusEq = vi.fn(() => ({ ilike, order }));
    const tenantEq = vi.fn(() => ({ eq: statusEq }));
    const studentSelect = vi.fn(() => ({ eq: tenantEq }));

    const contactIn = vi.fn().mockResolvedValue({
      data: [
        {
          id: "contact-1",
          tenant_id: "tenant-1",
          student_id: "student-1",
          type: "phone",
          label: null,
          value: "+56 9 1111",
          is_primary: true,
          status: "active",
          created_at: "2026-09-04T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const contactPrimaryEq = vi.fn(() => ({ in: contactIn }));
    const contactStatusEq = vi.fn(() => ({ eq: contactPrimaryEq }));
    const contactTenantEq = vi.fn(() => ({ eq: contactStatusEq }));
    const contactSelect = vi.fn(() => ({ eq: contactTenantEq }));

    const from = vi.fn((table: string) => {
      if (table === "students") return { select: studentSelect };
      return { select: contactSelect };
    });
    const repository = new SupabaseStudentRepository({
      from,
    } as unknown as SupabaseClient);

    const result = await repository.listForAdministration({
      tenantId: "tenant-1",
      page: 2,
      pageSize: 10,
      search: "Ana",
      status: "active",
    });

    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 10 });
    expect(result.rows).toEqual([
      expect.objectContaining({
        id: "student-1",
        fullName: "Ana Bravo",
        primaryContact: expect.objectContaining({ value: "+56 9 1111" }),
      }),
    ]);
    expect(studentSelect).toHaveBeenCalledWith("*", { count: "exact" });
    expect(tenantEq).toHaveBeenCalledWith("tenant_id", "tenant-1");
    expect(statusEq).toHaveBeenCalledWith("status", "active");
    expect(ilike).toHaveBeenCalledWith("full_name", "%Ana%");
    expect(order).toHaveBeenCalledWith("full_name");
    expect(range).toHaveBeenCalledWith(10, 19);
    expect(contactTenantEq).toHaveBeenCalledWith("tenant_id", "tenant-1");
    expect(contactIn).toHaveBeenCalledWith("student_id", ["student-1"]);
  });
});
