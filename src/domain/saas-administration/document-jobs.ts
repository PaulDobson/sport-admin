import { z } from "zod";

export const documentJobKinds = ["all", "receipt_pdf", "receipt_email"] as const;
export const documentJobFilters = ["attention", "all", "queued", "running", "succeeded", "failed", "unknown"] as const;
export interface DocumentJobFilters {
  query: string;
  kind: typeof documentJobKinds[number];
  status: typeof documentJobFilters[number];
  page: number;
  pageSize: number;
}

const timestamp = z.iso.datetime({ offset: true });
export const documentJobsPageSchema = z.object({
  queried_at: timestamp, page: z.number().int().positive(), page_size: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
  items: z.array(z.object({
    id: z.uuid(), kind: z.enum(["receipt_pdf", "receipt_email"]),
    status: z.enum(["queued", "running", "succeeded", "failed", "unknown"]),
    receipt_id: z.uuid(), folio: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    tenant_id: z.uuid(), tenant_name: z.string().min(1),
    attempts: z.number().int().nonnegative(), max_attempts: z.number().int().min(1).max(20),
    available_at: timestamp, lease_expires_at: timestamp.nullable(), lease_expired: z.boolean(),
    last_error: z.string().nullable(), created_at: timestamp, completed_at: timestamp.nullable(),
  })).max(100),
});
export type DocumentJobsPage = z.infer<typeof documentJobsPageSchema>;
