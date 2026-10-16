create index if not exists class_sessions_admin_status_start_idx
  on public.class_sessions (tenant_id, status, starts_at, id);
