begin;

create table public.saas_billing_operations (
  operation_id uuid primary key,
  action text not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  tenant_id uuid references public.tenants(id) on delete restrict,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now()
);

create table public.saas_scheduled_plan_changes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  subscription_id uuid not null,
  plan_id uuid not null references public.saas_plans(id) on delete restrict,
  plan_version_id uuid not null,
  effective_on date not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'applied', 'cancelled', 'blocked')),
  reason text not null check (length(btrim(reason)) between 3 and 500),
  blocked_reason text,
  operation_id uuid not null unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  foreign key (tenant_id, subscription_id)
    references public.saas_subscriptions(tenant_id, id) on delete restrict,
  foreign key (plan_id, plan_version_id)
    references public.saas_plan_versions(plan_id, id) on delete restrict,
  check (status <> 'blocked' or coalesce(length(btrim(blocked_reason)), 0) > 0),
  check ((status = 'scheduled' and processed_at is null)
    or (status <> 'scheduled' and processed_at is not null))
);
create unique index saas_scheduled_plan_changes_one_pending_idx
  on public.saas_scheduled_plan_changes(subscription_id) where status = 'scheduled';

create table public.saas_issuer_versions (
  id uuid primary key default gen_random_uuid(),
  version_number bigint generated always as identity unique,
  legal_name text not null check (length(btrim(legal_name)) between 1 and 160),
  tax_id text not null check (tax_id ~ '^[0-9]{7,8}-[0-9K]$'),
  address text not null check (length(btrim(address)) between 1 and 250),
  email text not null check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.saas_billing_settings (
  singleton boolean primary key default true check (singleton),
  issuer_version_id uuid not null references public.saas_issuer_versions(id) on delete restrict,
  updated_at timestamptz not null default now()
);
create trigger saas_issuer_versions_immutable
  before update or delete on public.saas_issuer_versions
  for each row execute function public.reject_saas_snapshot_mutation();

alter table public.saas_charges
  add column manual_method text check (manual_method in ('transfer', 'cash', 'external_card')),
  add column manual_reference text
    constraint saas_charges_manual_reference_length_check check (length(manual_reference) <= 200),
  add column recorded_by uuid references auth.users(id) on delete restrict,
  add constraint saas_charges_manual_reference_check check (
    manual_method is null or (
      recorded_by is not null and provider is null and external_charge_id is null
      and (manual_method = 'cash' or coalesce(length(btrim(manual_reference)), 0) > 0)
    )
  );

create sequence public.saas_receipt_folio_seq;
create table public.saas_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  charge_id uuid not null unique,
  invoice_id uuid not null,
  issuer_version_id uuid not null references public.saas_issuer_versions(id) on delete restrict,
  folio bigint not null default nextval('public.saas_receipt_folio_seq') unique,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  total numeric(12, 0) not null check (total > 0),
  net numeric(12, 0) not null check (net >= 0),
  vat numeric(12, 0) not null check (vat >= 0),
  vat_rate integer not null default 19 check (vat_rate = 19),
  currency text not null default 'CLP' check (currency = 'CLP'),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, charge_id) references public.saas_charges(tenant_id, id) on delete restrict,
  foreign key (tenant_id, invoice_id) references public.saas_invoices(tenant_id, id) on delete restrict,
  check (total = net + vat and net = round(total * 100 / 119))
);
create trigger saas_payment_receipts_immutable
  before update or delete on public.saas_payment_receipts
  for each row execute function public.reject_saas_snapshot_mutation();

create table public.saas_receipt_documents (
  receipt_id uuid primary key references public.saas_payment_receipts(id) on delete restrict,
  storage_path text not null unique,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  byte_size integer not null check (byte_size > 0),
  content_type text not null default 'application/pdf' check (content_type = 'application/pdf'),
  created_at timestamptz not null default now()
);
create trigger saas_receipt_documents_immutable
  before update or delete on public.saas_receipt_documents
  for each row execute function public.reject_saas_snapshot_mutation();

create table public.saas_receipt_deliveries (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.saas_payment_receipts(id) on delete restrict,
  operation_id uuid not null unique,
  recipient text not null check (recipient ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  recipient_source text not null check (recipient_source in ('billing', 'primary_contact')),
  fallback_approved boolean not null default false,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'accepted', 'delivered', 'failed', 'unknown')),
  provider_id text unique,
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  check (recipient_source <> 'primary_contact' or fallback_approved),
  check (status not in ('accepted', 'delivered') or (provider_id is not null and accepted_at is not null)),
  check (status <> 'delivered' or delivered_at is not null)
);

create table public.saas_billing_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('receipt_pdf', 'receipt_email')),
  receipt_id uuid not null references public.saas_payment_receipts(id) on delete restrict,
  delivery_id uuid references public.saas_receipt_deliveries(id) on delete restrict,
  deduplication_key text not null unique,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'unknown')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((kind = 'receipt_pdf' and delivery_id is null)
    or (kind = 'receipt_email' and delivery_id is not null)),
  check ((status = 'running' and lease_token is not null and lease_expires_at is not null)
    or (status <> 'running' and lease_token is null and lease_expires_at is null)),
  check (status <> 'succeeded' or completed_at is not null)
);
create index saas_billing_jobs_claim_idx on public.saas_billing_jobs(available_at, created_at)
  where status in ('queued', 'running');

-- No direct browser access, including platform admins: audited RPCs own these surfaces.
alter table public.saas_billing_operations enable row level security;
alter table public.saas_scheduled_plan_changes enable row level security;
alter table public.saas_issuer_versions enable row level security;
alter table public.saas_billing_settings enable row level security;
alter table public.saas_payment_receipts enable row level security;
alter table public.saas_receipt_documents enable row level security;
alter table public.saas_receipt_deliveries enable row level security;
alter table public.saas_billing_jobs enable row level security;
revoke all on public.saas_billing_operations, public.saas_scheduled_plan_changes,
  public.saas_issuer_versions, public.saas_billing_settings, public.saas_payment_receipts,
  public.saas_receipt_documents, public.saas_receipt_deliveries, public.saas_billing_jobs
  from public, anon, authenticated;
revoke all on sequence public.saas_receipt_folio_seq from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('saas-receipts', 'saas-receipts', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

commit;
