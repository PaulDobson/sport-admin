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
export function getSaasRenewalWorkerSecret(): string {
  return requireEnv("SAAS_RENEWAL_WORKER_SECRET");
}
export function getSaasDocumentWorkerSecret() {
  return requireEnv("SAAS_DOCUMENT_WORKER_SECRET");
}
export function getSaasDocumentReadiness() {
  const enabled = process.env.SAAS_DOCUMENTS_ENABLED;
  if (enabled !== undefined && enabled !== "true" && enabled !== "false") throw new Error("SAAS_DOCUMENTS_ENABLED must be true or false");
  return { enabled: enabled === "true",workerConfigured: Boolean(process.env.SAAS_DOCUMENT_WORKER_SECRET),
    mailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.SAAS_RECEIPT_FROM) };
}
export function getSaasReceiptMailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SAAS_RECEIPT_FROM;
  if (!apiKey && !from) return null;
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and SAAS_RECEIPT_FROM must be configured together");
  return { apiKey,from };
}
export function getSaasRenewalReadiness() {
  const enabled = process.env.SAAS_RENEWALS_ENABLED;
  if (enabled !== undefined && enabled !== "true" && enabled !== "false") {
    throw new Error("SAAS_RENEWALS_ENABLED must be true or false");
  }
  return { enabled: enabled === "true", schedulerConfigured: Boolean(process.env.SAAS_RENEWAL_WORKER_SECRET) };
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
