-- Stage 6: normalized, idempotent SaaS payment provider events.
-- Run after 0015_saas_tenant_backoffice.sql.

alter table public.saas_subscriptions
  add column if not exists payment_provider text;

alter table public.saas_invoices
  add column if not exists payment_provider text,
  add column if not exists external_invoice_id text;

create unique index if not exists saas_subscriptions_provider_external_idx
  on public.saas_subscriptions (payment_provider, external_subscription_id)
  where payment_provider is not null and external_subscription_id is not null;

create unique index if not exists saas_invoices_provider_external_idx
  on public.saas_invoices (payment_provider, external_invoice_id)
  where payment_provider is not null and external_invoice_id is not null;

create unique index if not exists saas_charges_provider_external_idx
  on public.saas_charges (provider, external_charge_id)
  where provider is not null and external_charge_id is not null;

create table if not exists public.saas_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  external_event_id text not null check (length(trim(external_event_id)) > 0),
  event_type text not null check (event_type in (
    'charge.succeeded', 'charge.failed', 'refund.succeeded', 'refund.failed'
  )),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  subscription_id uuid not null references public.saas_subscriptions(id) on delete restrict,
  charge_id uuid references public.saas_charges(id) on delete restrict,
  refund_id uuid references public.saas_refunds(id) on delete restrict,
  occurred_at timestamptz not null,
  processed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique (provider, external_event_id)
);

create index if not exists saas_provider_events_tenant_date_idx
  on public.saas_provider_events (tenant_id, occurred_at desc);

alter table public.saas_provider_events enable row level security;
-- No table policies by design: callers use the service-role-only function below.

create or replace function public.process_saas_payment_event(
  target_provider text,
  target_external_event_id text,
  target_event_type text,
  target_external_subscription_id text,
  target_external_invoice_id text,
  target_external_charge_id text,
  target_external_refund_id text,
  target_amount numeric,
  target_currency text,
  target_occurred_at timestamptz,
  target_reason text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  normalized_provider text := lower(trim(target_provider));
  normalized_currency text := upper(trim(target_currency));
  selected_subscription public.saas_subscriptions;
  selected_invoice public.saas_invoices;
  selected_charge public.saas_charges;
  created_charge_id uuid;
  created_refund_id uuid;
  created_event_id uuid;
  existing_event_id uuid;
  refunded_amount numeric;
begin
  if normalized_provider is null
    or normalized_provider !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or nullif(trim(target_external_event_id), '') is null
    or nullif(trim(target_external_subscription_id), '') is null
    or target_event_type not in (
      'charge.succeeded', 'charge.failed', 'refund.succeeded', 'refund.failed'
    ) then
    raise exception 'Invalid normalized payment event' using errcode = '22023';
  end if;
  if target_amount <= 0 or normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid payment amount or currency' using errcode = '22023';
  end if;
  if target_event_type like 'charge.%'
    and (
      nullif(trim(target_external_invoice_id), '') is null
      or nullif(trim(target_external_charge_id), '') is null
    ) then
    raise exception 'Charge event requires invoice and charge identifiers' using errcode = '22023';
  end if;
  if target_event_type like 'refund.%'
    and (
      nullif(trim(target_external_charge_id), '') is null
      or nullif(trim(target_external_refund_id), '') is null
    ) then
    raise exception 'Refund event requires charge and refund identifiers' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(normalized_provider || ':' || trim(target_external_event_id), 0)
  );
  select event.id into existing_event_id
  from public.saas_provider_events event
  where event.provider = normalized_provider
    and event.external_event_id = trim(target_external_event_id);
  if found then return existing_event_id; end if;

  select * into selected_subscription
  from public.saas_subscriptions subscription
  where subscription.payment_provider = normalized_provider
    and subscription.external_subscription_id = trim(target_external_subscription_id)
  for update;
  if not found then
    raise exception 'SaaS subscription not found for provider event' using errcode = 'P0002';
  end if;

  if target_event_type like 'charge.%' then
    select * into selected_invoice
    from public.saas_invoices invoice
    where invoice.tenant_id = selected_subscription.tenant_id
      and invoice.subscription_id = selected_subscription.id
      and invoice.payment_provider = normalized_provider
      and invoice.external_invoice_id = trim(target_external_invoice_id)
    for update;
    if not found then
      raise exception 'SaaS invoice not found for provider event' using errcode = 'P0002';
    end if;
    if selected_invoice.amount <> target_amount
      or selected_invoice.currency <> normalized_currency then
      raise exception 'Provider charge does not match invoice' using errcode = '23514';
    end if;

    insert into public.saas_charges (
      tenant_id, invoice_id, amount, currency, status, operation_id, provider,
      external_charge_id, failure_message, occurred_at
    ) values (
      selected_subscription.tenant_id, selected_invoice.id, target_amount,
      normalized_currency,
      case when target_event_type = 'charge.succeeded' then 'succeeded' else 'failed' end,
      gen_random_uuid(), normalized_provider, trim(target_external_charge_id),
      case when target_event_type = 'charge.failed' then nullif(trim(target_reason), '') end,
      target_occurred_at
    ) returning id into created_charge_id;

    if target_event_type = 'charge.succeeded' then
      update public.saas_invoices
      set status = 'paid', paid_at = target_occurred_at
      where id = selected_invoice.id;
      update public.saas_subscriptions
      set payment_status = 'paid',
        status = case when status in ('past_due', 'suspended') then 'active' else status end
      where id = selected_subscription.id;
    else
      update public.saas_invoices set status = 'past_due'
      where id = selected_invoice.id;
      update public.saas_subscriptions
      set payment_status = 'failed',
        status = case when status in ('trial', 'active') then 'past_due' else status end
      where id = selected_subscription.id;
    end if;
  else
    select * into selected_charge
    from public.saas_charges charge
    where charge.tenant_id = selected_subscription.tenant_id
      and charge.provider = normalized_provider
      and charge.external_charge_id = trim(target_external_charge_id)
    for update;
    if not found then
      raise exception 'SaaS charge not found for refund event' using errcode = 'P0002';
    end if;
    if selected_charge.currency <> normalized_currency then
      raise exception 'Provider refund currency does not match charge' using errcode = '23514';
    end if;

    select coalesce(sum(refund.amount), 0) into refunded_amount
    from public.saas_refunds refund
    where refund.tenant_id = selected_subscription.tenant_id
      and refund.charge_id = selected_charge.id
      and refund.status = 'succeeded';
    if refunded_amount + target_amount > selected_charge.amount then
      raise exception 'Provider refund exceeds charge amount' using errcode = '23514';
    end if;

    insert into public.saas_refunds (
      tenant_id, charge_id, amount, currency, status, reason, operation_id,
      external_refund_id, requested_at, processed_at
    ) values (
      selected_subscription.tenant_id, selected_charge.id, target_amount,
      normalized_currency,
      case when target_event_type = 'refund.succeeded' then 'succeeded' else 'failed' end,
      coalesce(nullif(trim(target_reason), ''), 'Provider refund'), gen_random_uuid(),
      trim(target_external_refund_id), target_occurred_at,
      case when target_event_type = 'refund.succeeded' then target_occurred_at end
    ) returning id into created_refund_id;

    if target_event_type = 'refund.succeeded'
      and refunded_amount + target_amount = selected_charge.amount then
      update public.saas_charges set status = 'refunded' where id = selected_charge.id;
      update public.saas_invoices set status = 'refunded' where id = selected_charge.invoice_id;
    end if;
  end if;

  insert into public.saas_provider_events (
    provider, external_event_id, event_type, tenant_id, subscription_id,
    charge_id, refund_id, occurred_at, metadata
  ) values (
    normalized_provider, trim(target_external_event_id), target_event_type,
    selected_subscription.tenant_id, selected_subscription.id,
    case when created_charge_id is not null then created_charge_id else selected_charge.id end,
    created_refund_id,
    target_occurred_at,
    jsonb_strip_nulls(jsonb_build_object(
      'external_invoice_id', nullif(trim(target_external_invoice_id), ''),
      'external_charge_id', nullif(trim(target_external_charge_id), ''),
      'external_refund_id', nullif(trim(target_external_refund_id), '')
    ))
  ) returning id into created_event_id;

  insert into public.audit_log (
    tenant_id, actor_id, action, entity_type, entity_id, occurred_at, metadata
  ) values (
    selected_subscription.tenant_id, null, 'saas.' || replace(target_event_type, '.', '_'),
    'saas_provider_event', created_event_id::text, target_occurred_at,
    jsonb_build_object('provider', normalized_provider, 'result', 'processed')
  );

  return created_event_id;
end;
$$;

revoke all on function public.process_saas_payment_event(
  text, text, text, text, text, text, text, numeric, text, timestamptz, text
) from public;
grant execute on function public.process_saas_payment_event(
  text, text, text, text, text, text, text, numeric, text, timestamptz, text
) to service_role;