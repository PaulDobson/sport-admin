-- Run after migrations 0001-0007. Set two real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status)
values
  ('50000000-0000-0000-0000-000000000001', 'Session Tenant A', 'active'),
  ('50000000-0000-0000-0000-000000000002', 'Session Tenant B', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  ('50000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000001', current_setting('test.user_a')::uuid, 'owner', 'active'),
  ('50000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000002', current_setting('test.user_b')::uuid, 'owner', 'active');

insert into public.locations (id, tenant_id, name, type)
values
  ('50000000-0000-0000-0000-000000000021', '50000000-0000-0000-0000-000000000001', 'Session Park A', 'park'),
  ('50000000-0000-0000-0000-000000000022', '50000000-0000-0000-0000-000000000002', 'Session Park B', 'park');

insert into public.students (id, tenant_id, full_name)
values
  ('50000000-0000-0000-0000-000000000031', '50000000-0000-0000-0000-000000000001', 'Student A1'),
  ('50000000-0000-0000-0000-000000000032', '50000000-0000-0000-0000-000000000001', 'Student A2'),
  ('50000000-0000-0000-0000-000000000033', '50000000-0000-0000-0000-000000000001', 'Student A3');

insert into public.disciplines (id, tenant_id, name)
values ('50000000-0000-0000-0000-000000000041', '50000000-0000-0000-0000-000000000001', 'Session Discipline');

insert into public.class_templates (id, tenant_id, discipline_id, name, capacity)
values (
  '50000000-0000-0000-0000-000000000051',
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000041',
  'Capacity Two',
  2
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
  '50000000-0000-0000-0000-000000000061',
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000051',
  '50000000-0000-0000-0000-000000000021',
  '50000000-0000-0000-0000-000000000011',
  1,
  '10:00',
  '11:00',
  'America/Argentina/Buenos_Aires'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

select set_config(
  'test.session_id',
  (public.generate_class_session(
    '50000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000061',
    '2026-08-24 13:00:00+00',
    '2026-08-24 14:00:00+00',
    true
  )).id::text,
  true
);

do $$
begin
  if not exists (
    select 1
    from public.class_sessions
    where id = current_setting('test.session_id')::uuid
      and class_template_id = '50000000-0000-0000-0000-000000000051'
      and location_id = '50000000-0000-0000-0000-000000000021'
      and instructor_membership_id = '50000000-0000-0000-0000-000000000011'
      and capacity = 2
      and timezone = 'America/Argentina/Buenos_Aires'
      and status = 'scheduled'
  ) then
    raise exception 'generated session did not inherit schedule/template values';
  end if;
end;
$$;

select public.enroll_student_in_session(
  '50000000-0000-0000-0000-000000000001',
  current_setting('test.session_id')::uuid,
  '50000000-0000-0000-0000-000000000031'
);
select public.enroll_student_in_session(
  '50000000-0000-0000-0000-000000000001',
  current_setting('test.session_id')::uuid,
  '50000000-0000-0000-0000-000000000032'
);
select public.enroll_student_in_session(
  '50000000-0000-0000-0000-000000000001',
  current_setting('test.session_id')::uuid,
  '50000000-0000-0000-0000-000000000033'
);

do $$
begin
  if (
    select count(*)
    from public.session_enrollments
    where session_id = current_setting('test.session_id')::uuid
      and status = 'confirmed'
  ) <> 2 then
    raise exception 'capacity must produce two confirmed enrollments';
  end if;
  if (
    select count(*)
    from public.session_enrollments
    where session_id = current_setting('test.session_id')::uuid
      and status = 'waitlisted'
  ) <> 1 then
    raise exception 'third enrollment must be waitlisted';
  end if;

  begin
    update public.class_sessions
    set capacity = 1
    where id = current_setting('test.session_id')::uuid;
    raise exception 'capacity reduction below confirmed count unexpectedly succeeded';
  exception
    when check_violation then null;
  end;
end;
$$;

select public.cancel_session_enrollment(
  '50000000-0000-0000-0000-000000000001',
  current_setting('test.session_id')::uuid,
  '50000000-0000-0000-0000-000000000031'
);

do $$
begin
  if not exists (
    select 1
    from public.session_enrollments
    where session_id = current_setting('test.session_id')::uuid
      and student_id = '50000000-0000-0000-0000-000000000033'
      and status = 'confirmed'
  ) then
    raise exception 'first waitlisted student was not promoted';
  end if;
  if (
    select count(*)
    from public.session_enrollments enrollment
    join public.students student
      on student.tenant_id = enrollment.tenant_id
     and student.id = enrollment.student_id
    where enrollment.session_id = current_setting('test.session_id')::uuid
      and enrollment.status = 'confirmed'
  ) <> 2 then
    raise exception 'expected participants must contain two confirmed students';
  end if;
end;
$$;

update public.class_sessions
set starts_at = '2026-08-24 14:00:00+00',
    ends_at = '2026-08-24 15:30:00+00',
    waitlist_enabled = false
where id = current_setting('test.session_id')::uuid;

do $$
begin
  if not exists (
    select 1
    from public.class_sessions
    where id = current_setting('test.session_id')::uuid
      and starts_at = '2026-08-24 14:00:00+00'
      and ends_at = '2026-08-24 15:30:00+00'
      and not waitlist_enabled
  ) then
    raise exception 'session edit was not persisted';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);

do $$
begin
  if (select count(*) from public.class_sessions where tenant_id = '50000000-0000-0000-0000-000000000001') <> 0 then
    raise exception 'cross-tenant session SELECT exposed data';
  end if;
  if (select count(*) from public.session_enrollments where tenant_id = '50000000-0000-0000-0000-000000000001') <> 0 then
    raise exception 'cross-tenant enrollment SELECT exposed data';
  end if;
end;
$$;

reset role;
rollback;