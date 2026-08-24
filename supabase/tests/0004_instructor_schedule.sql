-- Run after migrations 0001-0006. Set two real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status)
values
  ('40000000-0000-0000-0000-000000000001', 'Schedule Tenant A', 'active'),
  ('40000000-0000-0000-0000-000000000002', 'Schedule Tenant B', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  ('40000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000001', current_setting('test.user_a')::uuid, 'owner', 'active'),
  ('40000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000002', current_setting('test.user_b')::uuid, 'owner', 'active');

insert into public.locations (id, tenant_id, name, type)
values
  ('40000000-0000-0000-0000-000000000021', '40000000-0000-0000-0000-000000000001', 'Park A', 'park'),
  ('40000000-0000-0000-0000-000000000022', '40000000-0000-0000-0000-000000000002', 'Park B', 'park');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

insert into public.disciplines (id, tenant_id, name)
values ('40000000-0000-0000-0000-000000000031', '40000000-0000-0000-0000-000000000001', 'Functional Training');

insert into public.class_templates (id, tenant_id, discipline_id, name, capacity)
values (
  '40000000-0000-0000-0000-000000000041',
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000031',
  'Morning Class',
  12
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
  '40000000-0000-0000-0000-000000000051',
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000041',
  '40000000-0000-0000-0000-000000000021',
  '40000000-0000-0000-0000-000000000011',
  1,
  '10:00',
  '11:00',
  'America/Argentina/Buenos_Aires'
);

do $$
begin
  begin
    insert into public.class_schedules (
      tenant_id,
      class_template_id,
      location_id,
      instructor_membership_id,
      day_of_week,
      starts_at,
      ends_at,
      timezone
    ) values (
      '40000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000041',
      '40000000-0000-0000-0000-000000000021',
      '40000000-0000-0000-0000-000000000011',
      1,
      '10:30',
      '11:30',
      'America/Argentina/Buenos_Aires'
    );
    raise exception 'unconfirmed schedule conflict unexpectedly succeeded';
  exception
    when check_violation then null;
  end;
end;
$$;

insert into public.class_schedules (
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
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000041',
  '40000000-0000-0000-0000-000000000021',
  '40000000-0000-0000-0000-000000000011',
  1,
  '10:30',
  '11:30',
  'America/Argentina/Buenos_Aires',
  true
);

do $$
begin
  if (select count(*) from public.class_schedules) <> 2 then
    raise exception 'explicitly confirmed schedule conflict was not persisted';
  end if;
  if not exists (
    select 1
    from public.class_schedules
    where timezone = 'America/Argentina/Buenos_Aires'
      and allow_conflict
  ) then
    raise exception 'timezone or conflict confirmation was not preserved';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['disciplines', 'class_templates', 'class_schedules'] loop
    if (select count(*) from public.disciplines where tenant_id = '40000000-0000-0000-0000-000000000001') <> 0
      and table_name = 'disciplines' then
      raise exception 'cross-tenant discipline SELECT exposed data';
    end if;
    if (select count(*) from public.class_templates where tenant_id = '40000000-0000-0000-0000-000000000001') <> 0
      and table_name = 'class_templates' then
      raise exception 'cross-tenant template SELECT exposed data';
    end if;
    if (select count(*) from public.class_schedules where tenant_id = '40000000-0000-0000-0000-000000000001') <> 0
      and table_name = 'class_schedules' then
      raise exception 'cross-tenant schedule SELECT exposed data';
    end if;
  end loop;
end;
$$;

reset role;

do $$
declare
  command_name text;
  table_name text;
begin
  foreach table_name in array array['disciplines', 'class_templates', 'class_schedules'] loop
    foreach command_name in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = table_name
          and cmd = command_name
      ) then
        raise exception 'missing % RLS policy for %', command_name, table_name;
      end if;
    end loop;
  end loop;
end;
$$;

rollback;