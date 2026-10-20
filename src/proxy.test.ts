// @vitest-environment node
import { beforeEach,describe,expect,it,vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
const m = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/ssr",() => ({ createServerClient: () => ({ auth: { getUser: m.getUser } }) }));
vi.mock("@/infrastructure/supabase/env",() => ({ getSupabaseAnonKey: () => "test-key",getSupabaseUrl: () => "https://test.supabase.co" }));
beforeEach(() => { vi.resetAllMocks(); m.getUser.mockResolvedValue({ data: { user: null } }); });
describe("standalone billing session boundary",() => {
  it("requires authentication and preserves the chosen academy/page without an external redirect",async () => {
    const response = await proxy(new NextRequest("https://app.example.invalid/billing?tenant=academy-1&page=2"));
    expect(response.status).toBe(307); const target = new URL(response.headers.get("location")!);
    expect(target.origin).toBe("https://app.example.invalid"); expect(target.pathname).toBe("/log-in");
    expect(target.searchParams.get("next")).toBe("/billing?tenant=academy-1&page=2");
  });
  it("allows a session through without granting tenant or operational authorization",async () => {
    m.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
    const response = await proxy(new NextRequest("https://app.example.invalid/billing")); expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
  it("preserves existing public portal invitation behavior",async () => {
    expect((await proxy(new NextRequest("https://app.example.invalid/portal/accept?token=invite"))).status).toBe(200);
  });
});
