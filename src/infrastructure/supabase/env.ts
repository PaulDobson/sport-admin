/**
 * Server-only Supabase environment configuration.
 * Never import this module from `src/app` client components; use `browser-client.ts` for those.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}
export function getSaasWebhookSecret(): string {
  return requireEnv("SAAS_WEBHOOK_SECRET");
}
export function getNotificationWorkerSecret(): string {
  return requireEnv("NOTIFICATION_WORKER_SECRET");
}
export function getNotificationProviderConfig(channel: "email" | "push") {
  const prefix = channel === "email" ? "EMAIL" : "PUSH";
  const endpoint = process.env[`${prefix}_PROVIDER_ENDPOINT`];
  const token = process.env[`${prefix}_PROVIDER_TOKEN`];
  if (!endpoint && !token) return null;
  if (!endpoint || !token) {
    throw new Error(
      `${prefix} provider endpoint and token must be configured together`,
    );
  }
  return { endpoint, token };
}
export function getSiteUrl(): string {
  return requireEnv("NEXT_PUBLIC_SITE_URL");
}
