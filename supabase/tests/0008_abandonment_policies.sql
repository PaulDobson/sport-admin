-- Run after migrations 0001-0010. Set two real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status) values
  ('80000000-0000-4000-8000-000000000001', 'Abandonment Tenant A', 'active'),
  ('80000000-0000-4000-8000-000000000002', 'Abandonment Tenant B', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status) values
  ('80000000-0000-4000-8000-000000000011', '80000000-0000-4000-8000-000000000001', current_setting('test.user_a')::uuid, 'owner', 'active'),
  ('80000000-0000-4000-8000-000000000012', '80000000-0000-4000-8000-000000000002', current_setting('test.user_b')::uuid, 'owner', 'active');

insert into public.students (id, tenant_id, full_name) values
  ('80000000-0000-4000-8000-000000000021', '80000000-0000-4000-8000-000000000001', 'At-risk Student A');

insert into public.locations (id, tenant_id, name, type) values
  ('80000000-0000-4000-8000-000000000031', '80000000-0000-4000-8000-000000000001', 'Abandonment Park', 'park');
insert into public.disciplines (id, tenant_id, name) values
  ('80000000-0000-4000-8000-000000000041', '80000000-0000-4000-8000-000000000001', 'Abandonment Discipline');
insert into public.class_templates (id, tenant_id, discipline_id, name, capacity) values
  ('80000000-0000-4000-8000-000000000051', '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000041', 'Abandonment Class', 10);
insert into public.class_schedules (
  id, tenant_id, class_template_id, location_id, instructor_membership_id,
  day_of_week, starts_at, ends_at, timezone
) values (
  '80000000-0000-4000-8000-000000000061',
  '80000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000051',
  '80000000-0000-4000-8000-000000000031',
  '80000000-0000-4000-8000-000000000011',
  1, '09:00', '10:00', 'America/Argentina/Buenos_Aires'
);
insert into public.class_sessions (
  id, tenant_id, class_schedule_id, class_template_id, location_id,
  instructor_membership_id, starts_at, ends_at, timezone, capacity, status
) values
  ('80000000-0000-4000-8000-000000000071', '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000061', '80000000-0000-4000-8000-000000000051', '80000000-0000-4000-8000-000000000031', '80000000-0000-4000-8000-000000000011', '2026-08-14 12:00:00+00', '2026-08-14 13:00:00+00', 'America/Argentina/Buenos_Aires', 10, 'completed'),
  ('80000000-0000-4000-8000-000000000072', '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000061', '80000000-0000-4000-8000-000000000051', '80000000-0000-4000-8000-000000000031', '80000000-0000-4000-8000-000000000011', '2026-08-16 12:00:00+00', '2026-08-16 13:00:00+00', 'America/Argentina/Buenos_Aires', 10, 'completed'),
  ('80000000-0000-4000-8000-000000000073', '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000061', '80000000-0000-4000-8000-000000000051', '80000000-0000-4000-8000-000000000031', '80000000-0000-4000-8000-000000000011', '2026-08-18 12:00:00+00', '2026-08-18 13:00:00+00', 'America/Argentina/Buenos_Aires', 10, 'completed'),
  ('80000000-0000-4000-8000-000000000074', '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000061', '80000000-0000-4000-8000-000000000051', '80000000-0000-4000-8000-000000000031', '80000000-0000-4000-8000-000000000011', '2026-08-20 12:00:00+00', '2026-08-20 13:00:00+00', 'America/Argentina/Buenos_Aires', 10, 'completed');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

insert into public.abandonment_policies (
  tenant_id,
  instructor_membership_id,
  consecutive_absences_threshold,
  attendance_percentage_threshold,
  lookback_days
) values (
  '80000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000011',
  3,
  50,
  30
);

insert into public.class_session_attendance (
  tenant_id, session_id, student_id, recorded_by_membership_id,
  status, operation_id, recorded_at
) values (
  '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000071', '80000000-0000-4000-8000-000000000021', '80000000-0000-4000-8000-000000000011', 'absent', '80000000-0000-4000-8000-000000000081', '2026-08-14 12:00:00+00'
);
insert into public.class_session_attendance (
  tenant_id, session_id, student_id, recorded_by_membership_id,
  status, operation_id, recorded_at
) values (
  '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000072', '80000000-0000-4000-8000-000000000021', '80000000-0000-4000-8000-000000000011', 'absent', '80000000-0000-4000-8000-000000000082', '2026-08-16 12:00:00+00'
);
insert into public.class_session_attendance (
  tenant_id, session_id, student_id, recorded_by_membership_id,
  status, operation_id, recorded_at
) values (
  '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000073', '80000000-0000-4000-8000-000000000021', '80000000-0000-4000-8000-000000000011', 'absent', '80000000-0000-4000-8000-000000000083', '2026-08-18 12:00:00+00'
);
insert into public.class_session_attendance (
  tenant_id, session_id, student_id, recorded_by_membership_id,
  status, operation_id, recorded_at
) values (
  '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000074', '80000000-0000-4000-8000-000000000021', '80000000-0000-4000-8000-000000000011', 'absent', '80000000-0000-4000-8000-000000000084', '2026-08-20 12:00:00+00'
);

do $$
begin
  if (select count(*) from public.student_alerts where category = 'abandonment') <> 2 then
    raise exception 'attendance must create one alert per abandonment criterion';
  end if;
  if (
    select count(*) from public.student_alerts
    where deduplication_key like '%:consecutive_absences'
  ) <> 1 then
    raise exception 'consecutive absence recalculation must not duplicate alerts';
  end if;
  if (
    select count(*) from public.student_alerts
    where deduplication_key like '%:attendance_percentage'
  ) <> 1 then
    raise exception 'percentage recalculation must not duplicate alerts';
  end if;
  if (select consecutive_absences_threshold from public.abandonment_policies) <> 3 then
    raise exception 'instructor abandonment policy was not stored';
  end if;
end;
$$;

update public.student_alerts
set status = 'resolved', resolved_at = '2026-08-22 12:00:00+00'
where category = 'abandonment';

do $$
begin
  if (select count(*) from public.student_alerts where status = 'resolved') <> 2 then
    raise exception 'resolved alert must remain in history';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);

do $$
begin
  if (select count(*) from public.abandonment_policies) <> 0 then
    raise exception 'cross-tenant policy data leaked';
  end if;
  if (select count(*) from public.student_alerts where category = 'abandonment') <> 0 then
    raise exception 'cross-tenant alert history leaked';
  end if;
end;
$$;

rollback;