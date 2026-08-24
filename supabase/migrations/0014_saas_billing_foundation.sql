-- Stage 6: SaaS subscription billing, isolated from instructor finances.

alter table public.tenants
  add column if not exists billing_contact_name text,
  add column if not exists billing_contact_email text,
  add column if not exists billing_tax_id text;

create table if not exists public.saas_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  description text,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  billing_cycle text not null
    check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual')),
  trial_days integer not null default 0 check (trial_days between 0 and 365),
  max_students integer not null check (max_students > 0),
  max_users integer not null check (max_users > 0),
  features jsonb not null default '[]'::jsonb
    check (jsonb_typeof(features) = 'array'),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saas_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  plan_id uuid not null references public.saas_plans(id) on delete restrict,
  status text not null
    check (status in ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'partial', 'not_due')),
  starts_on date not null,
  trial_ends_on date,
  current_period_starts_on date not null,
  current_period_ends_on date not null,
  next_billing_date date,
  ended_on date,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  billing_cycle text not null
    check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual')),
  external_customer_id text,
  external_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (trial_ends_on is null or trial_ends_on >= starts_on),
  check (current_period_ends_on >= current_period_starts_on),
  check (ended_on is null or ended_on >= starts_on),
  check (status not in ('cancelled', 'expired') or ended_on is not null)
);

create unique index if not exists saas_subscriptions_one_current_idx
  on public.saas_subscriptions (tenant_id)
  where status in ('trial', 'active', 'past_due', 'suspended');

create table if not exists public.saas_limits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subscription_id uuid not null,
  max_students integer not null check (max_students > 0),
  max_users integer not null check (max_users > 0),
  features jsonb not null default '[]'::jsonb
    check (jsonb_typeof(features) = 'array'),
  effective_from date not null,
  effective_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, subscription_id),
  foreign key (tenant_id, subscription_id)
    references public.saas_subscriptions(tenant_id, id) on delete cascade,
  check (effective_until is null or effective_until >= effective_from)
);

create table if not exists public.saas_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  subscription_id uuid not null,
  invoice_number text not null check (length(trim(invoice_number)) > 0),
  status text not null default 'draft'
    check (status in ('draft', 'open', 'paid', 'past_due', 'void', 'refunded')),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  period_starts_on date not null,
  period_ends_on date not null,
  due_on date,
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, invoice_number),
  foreign key (tenant_id, subscription_id)
    references public.saas_subscriptions(tenant_id, id) on delete restrict,
  check (period_ends_on >= period_starts_on),
  check (status <> 'paid' or paid_at is not null)
);

create table if not exists public.saas_charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  invoice_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  operation_id uuid not null,
  provider text,
  external_charge_id text,
  failure_code text,
  failure_message text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, operation_id),
  foreign key (tenant_id, invoice_id)
    references public.saas_invoices(tenant_id, id) on delete restrict
);

create table if not exists public.saas_refunds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  charge_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  reason text not null check (length(trim(reason)) > 0),
  operation_id uuid not null,
  external_refund_id text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, operation_id),
  foreign key (tenant_id, charge_id)
    references public.saas_charges(tenant_id, id) on delete restrict,
  check (status <> 'succeeded' or processed_at is not null)
);

create table if not exists public.tenant_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  previous_status text
    check (previous_status is null or previous_status in ('pending', 'trial', 'active', 'suspended', 'cancelled')),
  new_status text not null
    check (new_status in ('pending', 'trial', 'active', 'suspended', 'cancelled')),
  reason text not null check (length(trim(reason)) > 0),
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create index if not exists saas_plans_status_idx
  on public.saas_plans (status, name);
create index if not exists saas_subscriptions_status_billing_idx
  on public.saas_subscriptions (status, next_billing_date);
create index if not exists saas_invoices_tenant_status_due_idx
  on public.saas_invoices (tenant_id, status, due_on);
create index if not exists saas_charges_tenant_status_date_idx
  on public.saas_charges (tenant_id, status, occurred_at desc);
create index if not exists saas_refunds_tenant_status_date_idx
  on public.saas_refunds (tenant_id, status, requested_at desc);
create index if not exists tenant_status_history_tenant_date_idx
  on public.tenant_status_history (tenant_id, occurred_at desc);

create or replace function public.set_saas_billing_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_saas_plans_updated_at
  before update on public.saas_plans
  for each row execute function public.set_saas_billing_updated_at();
create trigger set_saas_subscriptions_updated_at
  before update on public.saas_subscriptions
  for each row execute function public.set_saas_billing_updated_at();
create trigger set_saas_limits_updated_at
  before update on public.saas_limits
  for each row execute function public.set_saas_billing_updated_at();
create trigger set_saas_invoices_updated_at
  before update on public.saas_invoices
  for each row execute function public.set_saas_billing_updated_at();
create trigger set_saas_charges_updated_at
  before update on public.saas_charges
  for each row execute function public.set_saas_billing_updated_at();
create trigger set_saas_refunds_updated_at
  before update on public.saas_refunds
  for each row execute function public.set_saas_billing_updated_at();

create or replace function public.can_read_saas_billing(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  -- Billing remains visible to owners/admins while operational access is suspended.
  select public.is_platform_admin() or exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = target_tenant
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  );
$$;

revoke all on function public.set_saas_billing_updated_at() from public;
revoke all on function public.can_read_saas_billing(uuid) from public;
grant execute on function public.can_read_saas_billing(uuid) to authenticated;

alter table public.saas_plans enable row level security;
alter table public.saas_subscriptions enable row level security;
alter table public.saas_limits enable row level security;
alter table public.saas_invoices enable row level security;
alter table public.saas_charges enable row level security;
alter table public.saas_refunds enable row level security;
alter table public.tenant_status_history enable row level security;

create policy saas_plans_select on public.saas_plans for select
  using ((auth.uid() is not null and status = 'active') or public.is_platform_admin());
create policy saas_plans_insert on public.saas_plans for insert
  with check (public.is_platform_admin());
create policy saas_plans_update on public.saas_plans for update
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy saas_subscriptions_select on public.saas_subscriptions for select
  using (public.can_read_saas_billing(tenant_id));
create policy saas_subscriptions_insert on public.saas_subscriptions for insert
  with check (public.is_platform_admin());
create policy saas_subscriptions_update on public.saas_subscriptions for update
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy saas_limits_select on public.saas_limits for select
  using (public.can_read_saas_billing(tenant_id));
create policy saas_limits_insert on public.saas_limits for insert
  with check (public.is_platform_admin());
create policy saas_limits_update on public.saas_limits for update
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy saas_invoices_select on public.saas_invoices for select
  using (public.can_read_saas_billing(tenant_id));
create policy saas_invoices_insert on public.saas_invoices for insert
  with check (public.is_platform_admin());
create policy saas_invoices_update on public.saas_invoices for update
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy saas_charges_select on public.saas_charges for select
  using (public.can_read_saas_billing(tenant_id));
create policy saas_charges_insert on public.saas_charges for insert
  with check (public.is_platform_admin());
create policy saas_charges_update on public.saas_charges for update
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy saas_refunds_select on public.saas_refunds for select
  using (public.can_read_saas_billing(tenant_id));
create policy saas_refunds_insert on public.saas_refunds for insert
  with check (public.is_platform_admin());
create policy saas_refunds_update on public.saas_refunds for update
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy tenant_status_history_select on public.tenant_status_history for select
  using (public.can_read_saas_billing(tenant_id));
create policy tenant_status_history_insert on public.tenant_status_history for insert
  with check (public.is_platform_admin());