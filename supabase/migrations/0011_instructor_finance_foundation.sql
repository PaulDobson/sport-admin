-- Stage 5: instructor membership plans, payments, adjustments, and accounting events.

alter table public.membership_plans
  add column if not exists currency text not null default 'USD',
  add column if not exists billing_cycle text not null default 'monthly',
  add column if not exists benefits jsonb not null default '[]'::jsonb,
  add column if not exists expiration_grace_days integer not null default 0,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

alter table public.membership_plans
  add constraint membership_plans_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  add constraint membership_plans_billing_cycle_check
    check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual')),
  add constraint membership_plans_benefits_check
    check (jsonb_typeof(benefits) = 'array'),
  add constraint membership_plans_expiration_grace_days_check
    check (expiration_grace_days between 0 and 365),
  add constraint membership_plans_status_check
    check (status in ('active', 'archived'));

alter table public.student_memberships
  add column if not exists agreed_price numeric(12, 2),
  add column if not exists currency text,
  add column if not exists billing_cycle text,
  add column if not exists next_billing_date date,
  add column if not exists past_due_since date,
  add column if not exists paused_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.student_memberships membership
set
  agreed_price = plan.price,
  currency = plan.currency,
  billing_cycle = plan.billing_cycle,
  next_billing_date = membership.expires_at
from public.membership_plans plan
where plan.tenant_id = membership.tenant_id
  and plan.id = membership.plan_id
  and (
    membership.agreed_price is null
    or membership.currency is null
    or membership.billing_cycle is null
    or membership.next_billing_date is null
  );

alter table public.student_memberships
  alter column agreed_price set not null,
  alter column currency set not null,
  alter column billing_cycle set not null,
  alter column next_billing_date set not null;

alter table public.student_memberships
  drop constraint if exists student_memberships_status_check;
alter table public.student_memberships
  add constraint student_memberships_status_check
    check (status in ('active', 'paused', 'past_due', 'expired', 'cancelled')),
  add constraint student_memberships_agreed_price_check
    check (agreed_price >= 0),
  add constraint student_memberships_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  add constraint student_memberships_billing_cycle_check
    check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual')),
  add constraint student_memberships_status_dates_check check (
    (status <> 'paused' or paused_at is not null)
    and (status <> 'past_due' or past_due_since is not null)
    and (status <> 'cancelled' or cancelled_at is not null)
  );

create unique index if not exists student_memberships_tenant_id_key
  on public.student_memberships (tenant_id, id);

create table if not exists public.student_membership_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  membership_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'voided')),
  due_on date,
  paid_at timestamptz,
  reference text,
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, operation_id),
  check (status not in ('paid', 'refunded') or paid_at is not null),
  foreign key (tenant_id, membership_id)
    references public.student_memberships(tenant_id, id) on delete restrict
);

create table if not exists public.student_membership_adjustments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  membership_id uuid not null,
  payment_id uuid,
  kind text not null check (kind in ('discount', 'credit', 'tax')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  effective_on date not null,
  reason text not null check (length(trim(reason)) > 0),
  created_by_membership_id uuid not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, membership_id)
    references public.student_memberships(tenant_id, id) on delete restrict,
  foreign key (tenant_id, payment_id)
    references public.student_membership_payments(tenant_id, id) on delete restrict,
  foreign key (tenant_id, created_by_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete restrict
);

create table if not exists public.instructor_financial_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_type text not null
    check (entity_type in ('membership', 'payment', 'adjustment')),
  entity_id uuid not null,
  event_type text not null check (length(trim(event_type)) > 0),
  amount numeric(12, 2),
  currency text,
  actor_membership_id uuid not null,
  operation_id uuid not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  unique (tenant_id, id),
  unique (tenant_id, operation_id),
  check (amount is null or amount >= 0),
  check ((amount is null) = (currency is null)),
  check (currency is null or currency ~ '^[A-Z]{3}$'),
  foreign key (tenant_id, actor_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete restrict
);

create index if not exists membership_plans_tenant_status_idx
  on public.membership_plans (tenant_id, status, name);
create index if not exists student_memberships_tenant_status_due_idx
  on public.student_memberships (tenant_id, status, next_billing_date);
create index if not exists student_memberships_tenant_student_idx
  on public.student_memberships (tenant_id, student_id, created_at desc);
create index if not exists student_membership_payments_membership_date_idx
  on public.student_membership_payments (tenant_id, membership_id, created_at desc);
create index if not exists student_membership_payments_status_due_idx
  on public.student_membership_payments (tenant_id, status, due_on);
create index if not exists student_membership_adjustments_membership_date_idx
  on public.student_membership_adjustments (tenant_id, membership_id, effective_on desc);
create index if not exists instructor_financial_events_entity_date_idx
  on public.instructor_financial_events (tenant_id, entity_type, entity_id, occurred_at desc);

drop trigger if exists set_membership_plans_updated_at on public.membership_plans;
create trigger set_membership_plans_updated_at
  before update on public.membership_plans
  for each row execute function public.set_health_record_updated_at();
drop trigger if exists set_student_memberships_updated_at on public.student_memberships;
create trigger set_student_memberships_updated_at
  before update on public.student_memberships
  for each row execute function public.set_health_record_updated_at();
create trigger set_student_membership_payments_updated_at
  before update on public.student_membership_payments
  for each row execute function public.set_health_record_updated_at();

alter table public.student_membership_payments enable row level security;
alter table public.student_membership_adjustments enable row level security;
alter table public.instructor_financial_events enable row level security;

drop policy if exists membership_plans_select on public.membership_plans;
drop policy if exists membership_plans_insert on public.membership_plans;
drop policy if exists membership_plans_update on public.membership_plans;
drop policy if exists membership_plans_delete on public.membership_plans;
create policy membership_plans_select on public.membership_plans for select
  using (public.can_manage_student_records(tenant_id));
create policy membership_plans_insert on public.membership_plans for insert
  with check (public.can_manage_student_records(tenant_id));
create policy membership_plans_update on public.membership_plans for update
  using (public.can_manage_student_records(tenant_id))
  with check (public.can_manage_student_records(tenant_id));

drop policy if exists student_memberships_select on public.student_memberships;
drop policy if exists student_memberships_insert on public.student_memberships;
drop policy if exists student_memberships_update on public.student_memberships;
drop policy if exists student_memberships_delete on public.student_memberships;
create policy student_memberships_select on public.student_memberships for select
  using (public.can_manage_student_records(tenant_id));
create policy student_memberships_insert on public.student_memberships for insert
  with check (public.can_manage_student_records(tenant_id));
create policy student_memberships_update on public.student_memberships for update
  using (public.can_manage_student_records(tenant_id))
  with check (public.can_manage_student_records(tenant_id));

create policy student_membership_payments_select
  on public.student_membership_payments for select
  using (public.can_manage_student_records(tenant_id));
create policy student_membership_payments_insert
  on public.student_membership_payments for insert
  with check (public.can_manage_student_records(tenant_id));
create policy student_membership_payments_update
  on public.student_membership_payments for update
  using (public.can_manage_student_records(tenant_id))
  with check (public.can_manage_student_records(tenant_id));

create policy student_membership_adjustments_select
  on public.student_membership_adjustments for select
  using (public.can_manage_student_records(tenant_id));
create policy student_membership_adjustments_insert
  on public.student_membership_adjustments for insert
  with check (
    public.can_manage_student_records(tenant_id)
    and created_by_membership_id = public.current_membership_id(tenant_id)
  );

create policy instructor_financial_events_select
  on public.instructor_financial_events for select
  using (public.can_manage_student_records(tenant_id));
create policy instructor_financial_events_insert
  on public.instructor_financial_events for insert
  with check (
    public.can_manage_student_records(tenant_id)
    and actor_membership_id = public.current_membership_id(tenant_id)
  );