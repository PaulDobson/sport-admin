-- Run after migrations 0001-0005. Set two real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status)
values
  ('30000000-0000-0000-0000-000000000001', 'Operations Tenant A', 'active'),
  ('30000000-0000-0000-0000-000000000002', 'Operations Tenant B', 'active');

insert into public.tenant_memberships (tenant_id, user_id, role, status)
values
  ('30000000-0000-0000-0000-000000000001', current_setting('test.user_a')::uuid, 'owner', 'active'),
  ('30000000-0000-0000-0000-000000000002', current_setting('test.user_b')::uuid, 'owner', 'active');

insert into public.students (id, tenant_id, full_name)
values
  ('30000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000001', 'Student A'),
  ('30000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000002', 'Student B');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

insert into public.locations (tenant_id, name, type, address)
values
  ('30000000-0000-0000-0000-000000000001', 'External Gym', 'external_gym', 'Main Street 1'),
  ('30000000-0000-0000-0000-000000000001', 'Central Park', 'park', 'North Gate'),
  ('30000000-0000-0000-0000-000000000001', 'Student Home', 'home', 'Second Street 2'),
  ('30000000-0000-0000-0000-000000000001', 'Video Session', 'online', null);

do $$
begin
  if (
    select count(distinct type)
    from public.locations
    where tenant_id = '30000000-0000-0000-0000-000000000001'
  ) <> 4 then
    raise exception 'all four location types must be persisted';
  end if;
end;
$$;

insert into public.student_contacts (
  id,
  tenant_id,
  student_id,
  type,
  label,
  value,
  is_primary
)
values (
  '30000000-0000-0000-0000-000000000021',
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000011',
  'emergency',
  'Family',
  '+1 555 0100',
  true
);

update public.students
set status = 'archived', archived_at = now()
where id = '30000000-0000-0000-0000-000000000011';

do $$
begin
  if (select count(*) from public.students where id = '30000000-0000-0000-0000-000000000011') <> 1 then
    raise exception 'archived student history was not preserved';
  end if;
  if (select count(*) from public.students where id = '30000000-0000-0000-0000-000000000011' and status = 'active') <> 0 then
    raise exception 'archived student remained active';
  end if;
  if (select count(*) from public.student_contacts where student_id = '30000000-0000-0000-0000-000000000011') <> 1 then
    raise exception 'archiving a student removed contact history';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);

do $$
declare
  affected_rows integer;
begin
  if (select count(*) from public.student_contacts where tenant_id = '30000000-0000-0000-0000-000000000001') <> 0 then
    raise exception 'cross-tenant contact SELECT exposed data';
  end if;

  update public.student_contacts
  set value = 'tampered'
  where id = '30000000-0000-0000-0000-000000000021';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'cross-tenant contact UPDATE affected % rows', affected_rows;
  end if;

  delete from public.student_contacts
  where id = '30000000-0000-0000-0000-000000000021';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'cross-tenant contact DELETE affected % rows', affected_rows;
  end if;

  begin
    insert into public.student_contacts (tenant_id, student_id, type, value)
    values (
      '30000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000011',
      'phone',
      '+1 555 9999'
    );
    raise exception 'cross-tenant contact INSERT unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

do $$
declare
  command_name text;
begin
  foreach command_name in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'student_contacts'
        and cmd = command_name
    ) then
      raise exception 'missing % RLS policy for student_contacts', command_name;
    end if;
  end loop;
end;
$$;

rollback;