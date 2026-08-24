-- Stage 8: notification preferences, activity center, reliable delivery, and deduplication.

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  channel text not null check (channel in ('internal', 'email', 'push')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id, event_type, channel),
  foreign key (tenant_id, user_id)
    references public.tenant_memberships(tenant_id, user_id) on delete cascade
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  operation_id uuid not null,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  origin text not null check (origin in ('operations', 'finance', 'health', 'saas')),
  entity_type text not null check (length(trim(entity_type)) > 0),
  entity_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 160),
  message text not null check (length(trim(message)) between 1 and 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, operation_id)
);

create table if not exists public.activity_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_id uuid not null,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_role text not null check (recipient_role in ('owner', 'admin', 'instructor', 'assistant')),
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  read_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, event_id, recipient_user_id),
  foreign key (tenant_id, event_id)
    references public.activity_events(tenant_id, id) on delete cascade,
  foreign key (tenant_id, recipient_user_id)
    references public.tenant_memberships(tenant_id, user_id) on delete cascade,
  check (
    (status = 'pending' and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  )
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  activity_notification_id uuid not null,
  channel text not null check (channel in ('internal', 'email', 'push')),
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz,
  last_error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, activity_notification_id, channel),
  foreign key (tenant_id, activity_notification_id)
    references public.activity_notifications(tenant_id, id) on delete cascade,
  check (
    (status = 'delivered' and delivered_at is not null and next_attempt_at is null)
    or (status <> 'delivered' and delivered_at is null)
  ),
  check (status <> 'pending' or attempt_count < max_attempts)
);

create table if not exists public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  delivery_id uuid not null,
  attempt_number integer not null check (attempt_number between 1 and 20),
  status text not null check (status in ('pending', 'delivered', 'failed')),
  provider_reference text,
  error_code text,
  attempted_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (tenant_id, delivery_id, attempt_number),
  foreign key (tenant_id, delivery_id)
    references public.notification_deliveries(tenant_id, id) on delete cascade,
  check (
    (status = 'pending' and completed_at is null)
    or (status in ('delivered', 'failed') and completed_at is not null)
  )
);

create index if not exists notification_preferences_user_idx
  on public.notification_preferences (tenant_id, user_id, event_type);
create index if not exists activity_events_tenant_date_idx
  on public.activity_events (tenant_id, occurred_at desc);
create index if not exists activity_notifications_recipient_status_idx
  on public.activity_notifications (recipient_user_id, status, created_at desc);
create index if not exists notification_deliveries_pending_idx
  on public.notification_deliveries (next_attempt_at, created_at)
  where status = 'pending';
create index if not exists notification_delivery_attempts_delivery_idx
  on public.notification_delivery_attempts (tenant_id, delivery_id, attempt_number desc);

create trigger set_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_health_record_updated_at();
create trigger set_activity_notifications_updated_at
  before update on public.activity_notifications
  for each row execute function public.set_health_record_updated_at();
create trigger set_notification_deliveries_updated_at
  before update on public.notification_deliveries
  for each row execute function public.set_health_record_updated_at();

create or replace function public.prevent_notification_attempt_mutation()
returns trigger language plpgsql set search_path = public
as $$
begin
  raise exception 'notification delivery attempts are immutable' using errcode = '42501';
end;
$$;

create trigger prevent_notification_attempt_update
  before update or delete on public.notification_delivery_attempts
  for each row execute function public.prevent_notification_attempt_mutation();

create or replace function public.resolve_activity_notification(target_notification uuid)
returns public.activity_notifications
language plpgsql security definer set search_path = public
as $$
declare
  resolved public.activity_notifications;
begin
  update public.activity_notifications notification
  set status = 'resolved', resolved_at = now()
  where notification.id = target_notification
    and notification.recipient_user_id = auth.uid()
    and notification.tenant_id = any(public.current_tenant_ids())
  returning * into resolved;
  if not found then
    raise exception 'activity notification not found' using errcode = 'P0002';
  end if;
  return resolved;
end;
$$;

create or replace function public.can_read_activity_event(
  target_tenant uuid,
  target_event uuid
)
returns boolean language sql stable security definer set search_path = public
as $$
  select target_tenant = any(public.current_tenant_ids()) and exists (
    select 1
    from public.activity_notifications notification
    where notification.tenant_id = target_tenant
      and notification.event_id = target_event
      and notification.recipient_user_id = auth.uid()
  );
$$;

revoke all on function public.prevent_notification_attempt_mutation() from public;
revoke all on function public.resolve_activity_notification(uuid) from public;
revoke all on function public.can_read_activity_event(uuid, uuid) from public;
grant execute on function public.resolve_activity_notification(uuid) to authenticated;
grant execute on function public.can_read_activity_event(uuid, uuid) to authenticated;

alter table public.notification_preferences enable row level security;
alter table public.activity_events enable row level security;
alter table public.activity_notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_delivery_attempts enable row level security;

create policy notification_preferences_select on public.notification_preferences for select
  using (user_id = auth.uid() and tenant_id = any(public.current_tenant_ids()));
create policy notification_preferences_insert on public.notification_preferences for insert
  with check (user_id = auth.uid() and tenant_id = any(public.current_tenant_ids()));
create policy notification_preferences_update on public.notification_preferences for update
  using (user_id = auth.uid() and tenant_id = any(public.current_tenant_ids()))
  with check (user_id = auth.uid() and tenant_id = any(public.current_tenant_ids()));
create policy notification_preferences_delete on public.notification_preferences for delete
  using (user_id = auth.uid() and tenant_id = any(public.current_tenant_ids()));

create policy activity_events_select on public.activity_events for select
  using (public.can_read_activity_event(tenant_id, id));
create policy activity_notifications_select on public.activity_notifications for select
  using (
    recipient_user_id = auth.uid()
    and tenant_id = any(public.current_tenant_ids())
  );
create policy notification_deliveries_select on public.notification_deliveries for select
  using (exists (
    select 1
    from public.activity_notifications notification
    where notification.tenant_id = notification_deliveries.tenant_id
      and notification.id = notification_deliveries.activity_notification_id
      and notification.recipient_user_id = auth.uid()
  ));
create policy notification_delivery_attempts_select
  on public.notification_delivery_attempts for select
  using (exists (
    select 1
    from public.notification_deliveries delivery
    join public.activity_notifications notification
      on notification.tenant_id = delivery.tenant_id
     and notification.id = delivery.activity_notification_id
    where delivery.tenant_id = notification_delivery_attempts.tenant_id
      and delivery.id = notification_delivery_attempts.delivery_id
      and notification.recipient_user_id = auth.uid()
  ));

grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select on public.activity_events to authenticated;
grant select on public.activity_notifications to authenticated;
grant select on public.notification_deliveries to authenticated;
grant select on public.notification_delivery_attempts to authenticated;