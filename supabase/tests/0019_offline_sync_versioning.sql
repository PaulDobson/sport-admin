-- Run after migration 0021. Set one real auth user UUID below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);

insert into public.tenants (id, name, status)
values ('21000000-0000-4000-8000-000000000001', 'Sync Tenant', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values (
  '21000000-0000-4000-8000-000000000011',
  '21000000-0000-4000-8000-000000000001',
  current_setting('test.user_a')::uuid,
  'owner',
  'active'
);

insert into public.students (id, tenant_id, full_name)
values (
  '21000000-0000-4000-8000-000000000021',
  '21000000-0000-4000-8000-000000000001',
  'Sync Student'
);

insert into public.locations (id, tenant_id, name, type)
values (
  '21000000-0000-4000-8000-000000000031',
  '21000000-0000-4000-8000-000000000001',
  'Sync Park',
  'park'
);

insert into public.disciplines (id, tenant_id, name)
values (
  '21000000-0000-4000-8000-000000000041',
  '21000000-0000-4000-8000-000000000001',
  'Sync Discipline'
);

insert into public.class_templates (id, tenant_id, discipline_id, name, capacity)
values (
  '21000000-0000-4000-8000-000000000051',
  '21000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000041',
  'Sync Class',
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
  '21000000-0000-4000-8000-000000000061',
  '21000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000051',
  '21000000-0000-4000-8000-000000000031',
  '21000000-0000-4000-8000-000000000011',
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
  '21000000-0000-4000-8000-000000000071',
  '21000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000061',
  '21000000-0000-4000-8000-000000000051',
  '21000000-0000-4000-8000-000000000031',
  '21000000-0000-4000-8000-000000000011',
  '2026-08-24 12:00:00+00',
  '2026-08-24 13:00:00+00',
  'America/Argentina/Buenos_Aires',
  10
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

insert into public.health_conditions (
  id,
  tenant_id,
  student_id,
  name,
  source
)
values (
  '21000000-0000-4000-8000-000000000081',
  '21000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000021',
  'Sync condition',
  'self_reported'
);

insert into public.injuries (
  id,
  tenant_id,
  student_id,
  name,
  source
)
values (
  '21000000-0000-4000-8000-000000000082',
  '21000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000021',
  'Sync injury',
  'self_reported'
);

insert into public.health_restrictions (
  id,
  tenant_id,
  student_id,
  injury_id,
  description,
  operational_action,
  severity,
  source,
  starts_on
)
values (
  '21000000-0000-4000-8000-000000000083',
  '21000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000021',
  '21000000-0000-4000-8000-000000000082',
  'Avoid impact',
  'Use low-impact alternatives',
  'yellow',
  'instructor_review',
  '2026-08-23'
);

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
  '21000000-0000-4000-8000-000000000091',
  '21000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000071',
  '21000000-0000-4000-8000-000000000021',
  '21000000-0000-4000-8000-000000000011',
  'present',
  '21000000-0000-4000-8000-000000000092'
);

do $$
begin
  if (select version from public.health_conditions where id = '21000000-0000-4000-8000-000000000081') <> 1 then
    raise exception 'health condition initial version must be 1';
  end if;
  if (select version from public.injuries where id = '21000000-0000-4000-8000-000000000082') <> 1 then
    raise exception 'injury initial version must be 1';
  end if;
  if (select version from public.health_restrictions where id = '21000000-0000-4000-8000-000000000083') <> 1 then
    raise exception 'health restriction initial version must be 1';
  end if;
  if (select version from public.class_session_attendance where id = '21000000-0000-4000-8000-000000000091') <> 1 then
    raise exception 'attendance initial version must be 1';
  end if;
end;
$$;

update public.health_conditions
set status = 'resolved', resolved_at = '2026-08-23 15:00:00+00', version = 99
where id = '21000000-0000-4000-8000-000000000081';

update public.injuries
set notes = 'Reviewed', version = 99
where id = '21000000-0000-4000-8000-000000000082';

update public.health_restrictions
set operational_action = 'No impact work', version = 99
where id = '21000000-0000-4000-8000-000000000083';

update public.class_session_attendance
set status = 'late', operation_id = '21000000-0000-4000-8000-000000000093', version = 99
where id = '21000000-0000-4000-8000-000000000091';

do $$
begin
  if (select version from public.health_conditions where id = '21000000-0000-4000-8000-000000000081') <> 2 then
    raise exception 'health condition version must increment to 2';
  end if;
  if (select version from public.injuries where id = '21000000-0000-4000-8000-000000000082') <> 2 then
    raise exception 'injury version must increment to 2';
  end if;
  if (select version from public.health_restrictions where id = '21000000-0000-4000-8000-000000000083') <> 2 then
    raise exception 'health restriction version must increment to 2';
  end if;
  if (select version from public.class_session_attendance where id = '21000000-0000-4000-8000-000000000091') <> 2 then
    raise exception 'attendance version must increment to 2';
  end if;
  if (select status from public.health_conditions where id = '21000000-0000-4000-8000-000000000081') <> 'resolved' then
    raise exception 'sensitive health transition was not preserved';
  end if;
  if not exists (
    select 1
    from public.sensitive_audit_log
    where entity_type = 'health_conditions'
      and entity_id = '21000000-0000-4000-8000-000000000081'
      and action = 'update'
  ) then
    raise exception 'health transition was not audited';
  end if;
end;
$$;

do $$
declare
  affected integer;
begin
  update public.class_session_attendance
  set status = 'absent'
  where id = '21000000-0000-4000-8000-000000000091'
    and version = 1;
  get diagnostics affected = row_count;

  if affected <> 0 then
    raise exception 'stale attendance version unexpectedly overwrote the latest write';
  end if;
  if (select status from public.class_session_attendance where id = '21000000-0000-4000-8000-000000000091') <> 'late' then
    raise exception 'latest attendance write was not preserved';
  end if;
end;
$$;

reset role;
rollback;