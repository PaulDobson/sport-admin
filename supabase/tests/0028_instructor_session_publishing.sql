-- Run after migrations 0001-0032. Replace both UUIDs with distinct Auth user IDs.
begin;

select set_config('test.owner', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.other_user', '810363c9-4041-4ec2-a54a-1508d308e58d', true);
do $$
begin
  if not exists (
    select 1 from auth.users
    where id = current_setting('test.owner')::uuid
  ) then
    raise exception 'Replace test.owner with an existing user ID from Authentication > Users.';
  end if;
  if not exists (
    select 1 from auth.users
    where id = current_setting('test.other_user')::uuid
  ) then
    raise exception 'Replace test.other_user with a different existing Auth user ID.';
  end if;
  if current_setting('test.owner')::uuid = current_setting('test.other_user')::uuid then
    raise exception 'Use different IDs for owner and other user.';
  end if;
end;
$$;

insert into public.tenants (id, name, status)
values ('83200000-0000-4000-8000-000000000001', 'Session Publishing Test', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values (
  '83200000-0000-4000-8000-000000000011',
  '83200000-0000-4000-8000-000000000001',
  current_setting('test.owner')::uuid,
  'owner',
  'active'
);

insert into public.locations (id, tenant_id, name, type)
values (
  '83200000-0000-4000-8000-000000000021',
  '83200000-0000-4000-8000-000000000001',
  'Publishing Test Field',
  'external_gym'
);

insert into public.disciplines (id, tenant_id, name)
values (
  '83200000-0000-4000-8000-000000000031',
  '83200000-0000-4000-8000-000000000001',
  'Publishing Test Sport'
);

insert into public.class_templates (id, tenant_id, discipline_id, name, capacity)
values (
  '83200000-0000-4000-8000-000000000041',
  '83200000-0000-4000-8000-000000000001',
  '83200000-0000-4000-8000-000000000031',
  'Publishing Test Class',
  12
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner'), true);

select (public.create_one_off_class_session(
  '83200000-0000-4000-8000-000000000001',
  '83200000-0000-4000-8000-000000000041',
  '83200000-0000-4000-8000-000000000021',
  '83200000-0000-4000-8000-000000000011',
  (now() at time zone 'America/Santiago') + interval '3 days',
  (now() at time zone 'America/Santiago') + interval '3 days 1 hour',
  'America/Santiago',
  true
)).id;

insert into public.class_schedules (
  id,
  tenant_id,
  class_template_id,
  location_id,
  instructor_membership_id,
  day_of_week,
  starts_at,
  ends_at,
  timezone,
  allow_conflict
)
values (
  '83200000-0000-4000-8000-000000000051',
  '83200000-0000-4000-8000-000000000001',
  '83200000-0000-4000-8000-000000000041',
  '83200000-0000-4000-8000-000000000021',
  '83200000-0000-4000-8000-000000000011',
  1,
  '15:00',
  '16:00',
  'America/Santiago',
  true
);

select set_config(
  'test.schedule_id',
  (
    select id::text from public.class_schedules
    where id = '83200000-0000-4000-8000-000000000051'
  ),
  true
);

select set_config(
  'test.from_date',
  (
    current_date + ((1 - extract(dow from current_date)::integer + 7) % 7) + 7
  )::text,
  true
);
select set_config(
  'test.through_date',
  (
    current_setting('test.from_date')::date + 14
  )::text,
  true
);

select public.publish_recurring_class_sessions(
  '83200000-0000-4000-8000-000000000001',
  current_setting('test.schedule_id')::uuid,
  current_setting('test.from_date')::date,
  current_setting('test.through_date')::date,
  true
);

select public.publish_recurring_class_sessions(
  '83200000-0000-4000-8000-000000000001',
  current_setting('test.schedule_id')::uuid,
  current_setting('test.from_date')::date,
  current_setting('test.through_date')::date,
  true
);

do $$
declare
  one_off_count integer;
  recurring_count integer;
begin
  select count(*) into one_off_count
  from public.class_sessions session
  join public.class_schedules schedule
    on schedule.tenant_id = session.tenant_id
   and schedule.id = session.class_schedule_id
  where session.tenant_id = '83200000-0000-4000-8000-000000000001'
    and schedule.status = 'archived';
  if one_off_count <> 1 then
    raise exception 'one-off publication must create one session with an archived source schedule';
  end if;

  select count(*) into recurring_count
  from public.class_sessions
  where tenant_id = '83200000-0000-4000-8000-000000000001'
    and class_schedule_id = current_setting('test.schedule_id')::uuid;
  if recurring_count <> 3 then
    raise exception 'recurring publication must create three matching future occurrences';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.publish_recurring_class_sessions(
      '83200000-0000-4000-8000-000000000001',
      current_setting('test.schedule_id')::uuid,
      current_setting('test.from_date')::date,
      current_setting('test.from_date')::date + 57,
      true
    );
    raise exception 'publication beyond eight weeks unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('test.other_user'), true);
set local role authenticated;
do $$
begin
  begin
    perform public.publish_recurring_class_sessions(
      '83200000-0000-4000-8000-000000000001',
      current_setting('test.schedule_id')::uuid,
      current_setting('test.from_date')::date,
      current_setting('test.through_date')::date,
      true
    );
    raise exception 'out-of-tenant user unexpectedly published sessions';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
