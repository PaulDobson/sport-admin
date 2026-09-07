import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseProfileRepository } from "./supabase-profile-repository";
import { SupabaseTenantRepository } from "@/infrastructure/tenants/supabase-tenant-repository";

describe("Supabase identity read repositories", () => {
  it("scopes a profile read to the requested user", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "user-1", full_name: "Maya Torres", avatar_url: null },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const repository = new SupabaseProfileRepository({
      from,
    } as unknown as SupabaseClient);

    await expect(repository.findByUserId("user-1")).resolves.toEqual({
      userId: "user-1",
      fullName: "Maya Torres",
      avatarUrl: null,
    });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("returns only active tenants linked to the user", async () => {
    const inFilter = vi.fn().mockResolvedValue({
      data: [
        {
          id: "tenant-1",
          name: "Box Norte",
          status: "active",
          created_by: "user-1",
          created_at: "2026-08-24T10:00:00.000Z",
        },
      ],
      error: null,
    });
    const membershipStatus = vi.fn(() => ({ in: inFilter }));
    const membershipUser = vi.fn(() => ({ eq: membershipStatus }));
    const select = vi.fn(() => ({ eq: membershipUser }));
    const from = vi.fn(() => ({ select }));
    const repository = new SupabaseTenantRepository({
      from,
    } as unknown as SupabaseClient);

    const tenants = await repository.findOperationalByUser("user-1");

    expect(tenants[0]).toMatchObject({ id: "tenant-1", name: "Box Norte" });
    expect(from).toHaveBeenCalledWith("tenants");
    expect(membershipUser).toHaveBeenCalledWith(
      "tenant_memberships.user_id",
      "user-1",
    );
    expect(membershipStatus).toHaveBeenCalledWith(
      "tenant_memberships.status",
      "active",
    );
    expect(inFilter).toHaveBeenCalledWith("status", ["trial", "active"]);
  });

  it("scopes profile updates to the requested user", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "user-1", full_name: "Maya Updated", avatar_url: null },
      error: null,
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const repository = new SupabaseProfileRepository({
      from,
    } as unknown as SupabaseClient);

    await expect(
      repository.updateByUserId("user-1", {
        fullName: "Maya Updated",
        avatarUrl: null,
      }),
    ).resolves.toMatchObject({ fullName: "Maya Updated" });
    expect(update).toHaveBeenCalledWith({
      full_name: "Maya Updated",
      avatar_url: null,
    });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
  });
});
