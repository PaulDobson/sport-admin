import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserClient } from "@supabase/ssr";
import { createSupabaseBrowserClient } from "./browser-client";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ client: "browser" })),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("Supabase browser configuration", () => {
  it("constructs the browser client using only public configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-test-key");
    createSupabaseBrowserClient();
    expect(createBrowserClient).toHaveBeenCalledWith("https://example.supabase.co", "public-anon-key");
  });

  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])(
    "reports missing %s instead of returning a broken client",
    (name) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
      vi.stubEnv(name, "");
      expect(() => createSupabaseBrowserClient()).toThrow(`Missing required environment variable: ${name}`);
      expect(createBrowserClient).not.toHaveBeenCalled();
    },
  );
});
