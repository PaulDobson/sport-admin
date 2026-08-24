-- Run after migrations 0001-0008. Set two real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status)
values ('60000000-0000-4000-8000-000000000001', 'Role Matrix Tenant', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  (
    '60000000-0000-4000-8000-000000000011',
    '60000000-0000-4000-8000-000000000001',
    current_setting('test.user_a')::uuid,
    'owner',
    'active'
  ),
  (
    '60000000-0000-4000-8000-000000000012',
    '60000000-0000-4000-8000-000000000001',
    current_setting('test.user_b')::uuid,
    'instructor',
    'active'
  );

insert into public.locations (id, tenant_id, name, type)
values (
  '60000000-0000-4000-8000-000000000021',
  '60000000-0000-4000-8000-000000000001',
  'Role Matrix Park',
  'park'
);

insert into public.students (id, tenant_id, full_name)
values
  (
    '60000000-0000-4000-8000-000000000031',
    '60000000-0000-4000-8000-000000000001',
    'Role Matrix Student A'
  ),
  (
    '60000000-0000-4000-8000-000000000032',
    '60000000-0000-4000-8000-000000000001',
    'Role Matrix Student B'
  );

insert into public.disciplines (id, tenant_id, name)
values (
  '60000000-0000-4000-8000-000000000041',
  '60000000-0000-4000-8000-000000000001',
  'Role Matrix Discipline'
);

insert into public.class_templates (id, tenant_id, discipline_id, name, capacity)
values (
  '60000000-0000-4000-8000-000000000051',
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000041',
  'Role Matrix Class',
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
values
  (
    '60000000-0000-4000-8000-000000000061',
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000051',
    '60000000-0000-4000-8000-000000000021',
    '60000000-0000-4000-8000-000000000011',
    1,
    '09:00',
    '10:00',
    'America/Argentina/Buenos_Aires'
  ),
  (
    '60000000-0000-4000-8000-000000000062',
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000051',
    '60000000-0000-4000-8000-000000000021',
    '60000000-0000-4000-8000-000000000012',
    1,
    '11:00',
    '12:00',
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
values
  (
    '60000000-0000-4000-8000-000000000071',
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000061',
    '60000000-0000-4000-8000-000000000051',
    '60000000-0000-4000-8000-000000000021',
    '60000000-0000-4000-8000-000000000011',
    '2026-08-24 12:00:00+00',
    '2026-08-24 13:00:00+00',
    'America/Argentina/Buenos_Aires',
    10
  ),
  (
    '60000000-0000-4000-8000-000000000072',
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000062',
    '60000000-0000-4000-8000-000000000051',
    '60000000-0000-4000-8000-000000000021',
    '60000000-0000-4000-8000-000000000012',
    '2026-08-24 14:00:00+00',
    '2026-08-24 15:00:00+00',
    'America/Argentina/Buenos_Aires',
    10
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

do $$
declare
  affected integer;
begin
  if (select count(*) from public.class_schedules) <> 2 then
    raise exception 'owner must see every tenant schedule';
  end if;

  update public.class_schedules
  set timezone = 'America/Montevideo'
  where id = '60000000-0000-4000-8000-000000000062';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'owner must update another instructor schedule';
  end if;

  insert into public.students (tenant_id, full_name)
  values ('60000000-0000-4000-8000-000000000001', 'Owner Managed Student');
end;
$$;

reset role;
update public.tenant_memberships
set role = 'instructor'
where id = '60000000-0000-4000-8000-000000000011';
set local role authenticated;

do $$
declare
  affected integer;
begin
  if (select count(*) from public.class_schedules) <> 1 then
    raise exception 'instructor must see only their own schedule';
  end if;

  update public.class_schedules
  set timezone = 'America/Montevideo'
  where id = '60000000-0000-4000-8000-000000000061';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'responsible instructor must update their own schedule';
  end if;

  update public.class_schedules
  set timezone = 'UTC'
  where id = '60000000-0000-4000-8000-000000000062';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'instructor updated another instructor schedule';
  end if;

  insert into public.students (tenant_id, full_name)
  values ('60000000-0000-4000-8000-000000000001', 'Instructor Managed Student');

  insert into public.session_enrollments (tenant_id, session_id, student_id, status)
  values (
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000071',
    '60000000-0000-4000-8000-000000000031',
    'confirmed'
  );

  begin
    insert into public.session_enrollments (tenant_id, session_id, student_id, status)
    values (
      '60000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000072',
      '60000000-0000-4000-8000-000000000031',
      'confirmed'
    );
    raise exception 'instructor enrolled a student in another instructor session';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
update public.tenant_memberships
set role = 'assistant'
where id = '60000000-0000-4000-8000-000000000011';
set local role authenticated;

do $$
declare
  affected integer;
begin
  if (select count(*) from public.students) < 2 then
    raise exception 'assistant must read tenant students';
  end if;
  if (select count(*) from public.class_schedules) <> 0 then
    raise exception 'unassigned assistant must not see schedules';
  end if;

  update public.students
  set full_name = 'Assistant Changed Student'
  where id = '60000000-0000-4000-8000-000000000031';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'assistant updated a student';
  end if;

  begin
    insert into public.students (tenant_id, full_name)
    values ('60000000-0000-4000-8000-000000000001', 'Assistant Student');
    raise exception 'assistant created a student';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
insert into public.assistant_instructor_assignments (
  tenant_id,
  assistant_membership_id,
  instructor_membership_id
)
values (
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000011',
  '60000000-0000-4000-8000-000000000012'
);
set local role authenticated;

do $$
declare
  affected integer;
begin
  if (select count(*) from public.class_schedules) <> 1 then
    raise exception 'assistant must see only the assigned instructor schedule';
  end if;
  if not exists (
    select 1
    from public.class_schedules
    where id = '60000000-0000-4000-8000-000000000062'
  ) then
    raise exception 'assistant cannot see assigned instructor schedule';
  end if;

  update public.class_schedules
  set timezone = 'UTC'
  where id = '60000000-0000-4000-8000-000000000062';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'assistant updated assigned instructor schedule';
  end if;

  insert into public.session_enrollments (tenant_id, session_id, student_id, status)
  values (
    '60000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000072',
    '60000000-0000-4000-8000-000000000032',
    'confirmed'
  );

  begin
    insert into public.session_enrollments (tenant_id, session_id, student_id, status)
    values (
      '60000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000071',
      '60000000-0000-4000-8000-000000000032',
      'confirmed'
    );
    raise exception 'assistant enrolled a student outside the assigned scope';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;