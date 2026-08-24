-- Run after migration 0022. Set two real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status)
values
  ('22000000-0000-4000-8000-000000000001', 'Realtime Tenant A', 'active'),
  ('22000000-0000-4000-8000-000000000002', 'Realtime Tenant B', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  (
    '22000000-0000-4000-8000-000000000011',
    '22000000-0000-4000-8000-000000000001',
    current_setting('test.user_a')::uuid,
    'owner',
    'active'
  ),
  (
    '22000000-0000-4000-8000-000000000012',
    '22000000-0000-4000-8000-000000000002',
    current_setting('test.user_b')::uuid,
    'owner',
    'active'
  );

insert into public.students (id, tenant_id, full_name)
values (
  '22000000-0000-4000-8000-000000000021',
  '22000000-0000-4000-8000-000000000001',
  'Realtime Student A'
);

insert into public.locations (id, tenant_id, name, type)
values (
  '22000000-0000-4000-8000-000000000031',
  '22000000-0000-4000-8000-000000000001',
  'Realtime Park A',
  'park'
);

insert into public.disciplines (id, tenant_id, name)
values (
  '22000000-0000-4000-8000-000000000041',
  '22000000-0000-4000-8000-000000000001',
  'Realtime Discipline A'
);

insert into public.class_templates (id, tenant_id, discipline_id, name, capacity)
values (
  '22000000-0000-4000-8000-000000000051',
  '22000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000041',
  'Realtime Class A',
  10
);

insert into public.class_schedules (
  id,
  tenant_id,
  class_template_id,
  location_id,
  instructor_membership_id,
  day_of_week,
  starts_at,
  ends_at,
  timezone
)
values (
  '22000000-0000-4000-8000-000000000061',
  '22000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000051',
  '22000000-0000-4000-8000-000000000031',
  '22000000-0000-4000-8000-000000000011',
  1,
  '09:00',
  '10:00',
  'America/Argentina/Buenos_Aires'
);

insert into public.class_sessions (
  id,
  tenant_id,
  class_schedule_id,
  class_template_id,
  location_id,
  instructor_membership_id,
  starts_at,
  ends_at,
  timezone,
  capacity
)
values (
  '22000000-0000-4000-8000-000000000071',
  '22000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000061',
  '22000000-0000-4000-8000-000000000051',
  '22000000-0000-4000-8000-000000000031',
  '22000000-0000-4000-8000-000000000011',
  '2026-08-24 12:00:00+00',
  '2026-08-24 13:00:00+00',
  'America/Argentina/Buenos_Aires',
  10
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

insert into public.class_session_attendance (
  id,
  tenant_id,
  session_id,
  student_id,
  recorded_by_membership_id,
  status,
  operation_id
)
values (
  '22000000-0000-4000-8000-000000000081',
  '22000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000071',
  '22000000-0000-4000-8000-000000000021',
  '22000000-0000-4000-8000-000000000011',
  'present',
  '22000000-0000-4000-8000-000000000082'
);

insert into public.student_alerts (
  id,
  tenant_id,
  student_id,
  class_session_id,
  category,
  severity,
  reason,
  operational_action,
  deduplication_key
)
values (
  '22000000-0000-4000-8000-000000000091',
  '22000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000021',
  '22000000-0000-4000-8000-000000000071',
  'health',
  'yellow',
  'Private medical reason must not enter Realtime',
  'Private medical action must not enter Realtime',
  'realtime-test-alert'
);

do $$
begin
  if (
    select count(*)
    from public.session_realtime_events
    where session_id = '22000000-0000-4000-8000-000000000071'
  ) <> 2 then
    raise exception 'authorized session must receive attendance and alert events';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'session_realtime_events'
      and column_name in ('reason', 'operational_action', 'note', 'student_id')
  ) then
    raise exception 'realtime event payload exposes unnecessary sensitive data';
  end if;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'session_realtime_events'
  ) then
    raise exception 'session_realtime_events is not in supabase_realtime';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);

do $$
begin
  if (select count(*) from public.session_realtime_events) <> 0 then
    raise exception 'cross-tenant realtime event was exposed';
  end if;
end;
$$;

reset role;
rollback;