import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  getSaasWebhookSecret,
} from "./env";

describe("supabase env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads required variables when present", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("SAAS_WEBHOOK_SECRET", "webhook-secret");

    expect(getSupabaseUrl()).toBe("https://example.supabase.co");
    expect(getSupabaseAnonKey()).toBe("anon-key");
    expect(getSupabaseServiceRoleKey()).toBe("service-role-key");
    expect(getSaasWebhookSecret()).toBe("webhook-secret");
  });

  it("throws a clear error when a variable is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    expect(() => getSupabaseUrl()).toThrow(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL",
    );
  });
});
