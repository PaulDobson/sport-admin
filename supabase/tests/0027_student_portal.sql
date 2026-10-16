-- Run after migrations 0001-0031. Replace all three UUIDs with real Auth user IDs.
begin;

select set_config('test.owner', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.guardian', '90000000-0000-4000-8000-000000000003', true);
select set_config('test.other_user', '810363c9-4041-4ec2-a54a-1508d308e58d', true);
do $$
declare
  owner_id uuid := current_setting('test.owner')::uuid;
  guardian_id uuid := current_setting('test.guardian')::uuid;
  other_id uuid := current_setting('test.other_user')::uuid;
begin
  if not exists (select 1 from auth.users where id = owner_id) then
    raise exception 'Replace test.owner with an existing user ID from Authentication > Users.';
  end if;
  if not exists (
    select 1 from auth.users
    where id = guardian_id
      and email is not null
      and email_confirmed_at is not null
  ) then
    raise exception 'Replace test.guardian with an existing user whose email is verified.';
  end if;
  if not exists (
    select 1 from auth.users
    where id = other_id
      and email is not null
      and email_confirmed_at is not null
  ) then
    raise exception 'Replace test.other_user with a different existing user whose email is verified.';
  end if;
  if owner_id = guardian_id or owner_id = other_id or guardian_id = other_id then
    raise exception 'Use three distinct Auth user IDs for owner, guardian, and other user.';
  end if;
  if exists (
    select 1
    from auth.users guardian
    join auth.users other_user on other_user.id = other_id
    where guardian.id = guardian_id
      and lower(guardian.email) = lower(other_user.email)
  ) then
    raise exception 'test.other_user must have a different email from test.guardian.';
  end if;
end;
$$;

insert into public.tenants (id, name, status)
values ('73100000-0000-4000-8000-000000000001', 'Portal Test Academy', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values (
  '73100000-0000-4000-8000-000000000011',
  '73100000-0000-4000-8000-000000000001',
  current_setting('test.owner')::uuid,
  'owner',
  'active'
);

insert into public.locations (id, tenant_id, name, type)
values (
  '73100000-0000-4000-8000-000000000021',
  '73100000-0000-4000-8000-000000000001',
  'Portal Test Gym',
  'external_gym'
);

insert into public.students (id, tenant_id, full_name)
values
  ('73100000-0000-4000-8000-000000000031', '73100000-0000-4000-8000-000000000001', 'Linked Student'),
  ('73100000-0000-4000-8000-000000000032', '73100000-0000-4000-8000-000000000001', 'Unlinked Student');

insert into public.student_contacts (
  tenant_id, student_id, type, label, value, is_primary
)
select
  '73100000-0000-4000-8000-000000000001',
  '73100000-0000-4000-8000-000000000031',
  'email',
  'Guardian',
  lower(email),
  true
from auth.users
where id = current_setting('test.guardian')::uuid;

insert into public.disciplines (id, tenant_id, name)
values (
  '73100000-0000-4000-8000-000000000041',
  '73100000-0000-4000-8000-000000000001',
  'Portal Discipline'
);

insert into public.class_templates (id, tenant_id, discipline_id, name, capacity)
values (
  '73100000-0000-4000-8000-000000000051',
  '73100000-0000-4000-8000-000000000001',
  '73100000-0000-4000-8000-000000000041',
  'Portal Class',
  1
);

insert into public.class_schedules (
  id, tenant_id, class_template_id, location_id, instructor_membership_id,
  day_of_week, starts_at, ends_at, timezone
)
values (
  '73100000-0000-4000-8000-000000000061',
  '73100000-0000-4000-8000-000000000001',
  '73100000-0000-4000-8000-000000000051',
  '73100000-0000-4000-8000-000000000021',
  '73100000-0000-4000-8000-000000000011',
  1,
  '09:00',
  '10:00',
  'America/Santiago'
);

insert into public.class_sessions (
  id, tenant_id, class_schedule_id, class_template_id, location_id,
  instructor_membership_id, starts_at, ends_at, timezone, capacity
)
values (
  '73100000-0000-4000-8000-000000000071',
  '73100000-0000-4000-8000-000000000001',
  '73100000-0000-4000-8000-000000000061',
  '73100000-0000-4000-8000-000000000051',
  '73100000-0000-4000-8000-000000000021',
  '73100000-0000-4000-8000-000000000011',
  now() + interval '2 days',
  now() + interval '2 days 1 hour',
  'America/Santiago',
  1
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner'), true);
select * from public.create_student_portal_invitation(
  '73100000-0000-4000-8000-000000000001',
  '73100000-0000-4000-8000-000000000031',
  repeat('a', 64),
  now() + interval '1 day'
);

select set_config('request.jwt.claim.sub', current_setting('test.guardian'), true);
do $$
begin
  if not public.has_pending_student_portal_invitation() then
    raise exception 'invited verified account must be blocked from instructor onboarding';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.other_user'), true);
do $$
begin
  if public.has_pending_student_portal_invitation() then
    raise exception 'uninvited account must not see another email invitation';
  end if;
  begin
    perform public.redeem_student_portal_invitation(repeat('a', 64));
    raise exception 'account with a different email unexpectedly redeemed invite';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.guardian'), true);
select public.redeem_student_portal_invitation(repeat('a', 64));
do $$
begin
  if public.has_pending_student_portal_invitation() then
    raise exception 'redeemed invite must no longer be pending';
  end if;
  begin
    perform public.redeem_student_portal_invitation(repeat('a', 64));
    raise exception 'invitation unexpectedly redeemed more than once';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select public.enroll_student_in_session(
  '73100000-0000-4000-8000-000000000001',
  '73100000-0000-4000-8000-000000000071',
  '73100000-0000-4000-8000-000000000031'
);

do $$
declare
  visible_students integer;
  visible_sessions integer;
begin
  select count(*) into visible_students
  from public.list_my_student_portal_students();
  if visible_students <> 1 then
    raise exception 'portal account must see only its explicitly linked student';
  end if;

  select count(*) into visible_sessions
  from public.list_my_student_portal_sessions(
    '73100000-0000-4000-8000-000000000031'
  );
  if visible_sessions <> 1 then
    raise exception 'portal must list the linked student upcoming session';
  end if;

  if not exists (
    select 1 from public.list_my_student_portal_sessions(
      '73100000-0000-4000-8000-000000000031'
    ) where enrollment_status = 'confirmed'
  ) then
    raise exception 'portal enrollment must be reflected as confirmed';
  end if;

  perform public.cancel_session_enrollment(
    '73100000-0000-4000-8000-000000000001',
    '73100000-0000-4000-8000-000000000071',
    '73100000-0000-4000-8000-000000000031'
  );
  if exists (
    select 1 from public.list_my_student_portal_sessions(
      '73100000-0000-4000-8000-000000000031'
    )
    where session_id = '73100000-0000-4000-8000-000000000071'
      and enrollment_status is not null
  ) then
    raise exception 'cancelled portal enrollment must be available to reserve again';
  end if;

  begin
    perform * from public.list_my_student_portal_sessions(
      '73100000-0000-4000-8000-000000000032'
    );
    raise exception 'portal account unexpectedly queried an unlinked student';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.enroll_student_in_session(
      '73100000-0000-4000-8000-000000000001',
      '73100000-0000-4000-8000-000000000071',
      '73100000-0000-4000-8000-000000000032'
    );
    raise exception 'portal account unexpectedly enrolled an unlinked student';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('test.owner'), true);
select public.enroll_student_in_session(
  '73100000-0000-4000-8000-000000000001',
  '73100000-0000-4000-8000-000000000071',
  '73100000-0000-4000-8000-000000000032'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.guardian'), true);
select public.enroll_student_in_session(
  '73100000-0000-4000-8000-000000000001',
  '73100000-0000-4000-8000-000000000071',
  '73100000-0000-4000-8000-000000000031'
);

do $$
begin
  if not exists (
    select 1 from public.list_my_student_portal_sessions(
      '73100000-0000-4000-8000-000000000031'
    ) where enrollment_status = 'waitlisted' and waitlisted_count = 1
  ) then
    raise exception 'full session must place the portal student on its waitlist';
  end if;
end;
$$;

rollback;
