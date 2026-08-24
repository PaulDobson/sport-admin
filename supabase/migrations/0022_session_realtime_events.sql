create table if not exists public.session_realtime_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id uuid not null,
  event_type text not null check (event_type in ('attendance', 'alert')),
  entity_id uuid not null,
  operation text not null check (operation in ('insert', 'update', 'delete')),
  occurred_at timestamptz not null default now(),
  foreign key (tenant_id, session_id)
    references public.class_sessions(tenant_id, id) on delete cascade
);

create index if not exists session_realtime_events_session_date_idx
  on public.session_realtime_events (tenant_id, session_id, occurred_at desc);

alter table public.session_realtime_events enable row level security;

create policy session_realtime_events_select
  on public.session_realtime_events for select
  using (
    public.can_manage_session_enrollments(tenant_id, session_id)
    and (
      event_type = 'attendance'
      or public.can_access_student_health(tenant_id)
    )
  );

grant select on public.session_realtime_events to authenticated;

create or replace function public.publish_session_realtime_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_record record;
  source_session_id uuid;
  source_event_type text;
begin
  if tg_op = 'DELETE' then
    source_record := old;
  else
    source_record := new;
  end if;
  if tg_table_name = 'class_session_attendance' then
    source_session_id := source_record.session_id;
    source_event_type := 'attendance';
  else
    source_session_id := source_record.class_session_id;
    source_event_type := 'alert';
  end if;

  if source_session_id is not null then
    insert into public.session_realtime_events (
      tenant_id,
      session_id,
      event_type,
      entity_id,
      operation
    ) values (
      source_record.tenant_id,
      source_session_id,
      source_event_type,
      source_record.id,
      lower(tg_op)
    );
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.publish_session_realtime_event() from public;

create trigger publish_attendance_realtime_event
  after insert or update or delete on public.class_session_attendance
  for each row execute function public.publish_session_realtime_event();

create trigger publish_alert_realtime_event
  after insert or update or delete on public.student_alerts
  for each row execute function public.publish_session_realtime_event();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'session_realtime_events'
  ) then
    alter publication supabase_realtime add table public.session_realtime_events;
  end if;
end;
$$;