-- Run this in the Supabase SQL Editor after 0001_init.sql and 0002_identity.sql.
-- Replace the two user UUIDs with IDs from Authentication > Users before running.
-- Exercises SELECT, INSERT, UPDATE, and DELETE across tenants, account states,
-- membership states, and the platform administrator role.
begin;

insert into public.tenants (id, name, status)
values
  ('20000000-0000-0000-0000-000000000001', 'Tenant A', 'active'),
  ('20000000-0000-0000-0000-000000000002', 'Tenant B', 'active'),
  ('20000000-0000-0000-0000-000000000004', 'Suspended Tenant', 'suspended'),
  ('20000000-0000-0000-0000-000000000005', 'Revoked Membership Tenant', 'active')
on conflict (id) do nothing;

insert into public.tenant_memberships (tenant_id, user_id, role, status)
values
  ('20000000-0000-0000-0000-000000000001', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', 'owner', 'active'),
  ('20000000-0000-0000-0000-000000000002', '810363c9-4041-4ec2-a54a-1508d308e58d', 'owner', 'active'),
  ('20000000-0000-0000-0000-000000000004', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', 'instructor', 'active'),
  ('20000000-0000-0000-0000-000000000005', '810363c9-4041-4ec2-a54a-1508d308e58d', 'assistant', 'revoked')
on conflict (tenant_id, user_id) do nothing;

insert into public.locations (id, tenant_id, name)
values
  ('20000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'Location A'),
  ('20000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000002', 'Location B')
on conflict (id) do nothing;

insert into public.students (id, tenant_id, full_name)
values
  ('20000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000001', 'Student A'),
  ('20000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000002', 'Student B')
on conflict (id) do nothing;

insert into public.sessions (id, tenant_id, location_id, starts_at, ends_at)
values
  ('20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000011', '2026-08-22 10:00:00+00', '2026-08-22 11:00:00+00'),
  ('20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000012', '2026-08-22 10:00:00+00', '2026-08-22 11:00:00+00')
on conflict (id) do nothing;

insert into public.session_attendance (id, tenant_id, session_id, student_id, status)
values
  ('20000000-0000-0000-0000-000000000041', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000021', 'present'),
  ('20000000-0000-0000-0000-000000000042', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000022', 'present')
on conflict (id) do nothing;

insert into public.membership_plans (id, tenant_id, name, price, duration_days)
values
  ('20000000-0000-0000-0000-000000000051', '20000000-0000-0000-0000-000000000001', 'Plan A', 100, 30),
  ('20000000-0000-0000-0000-000000000052', '20000000-0000-0000-0000-000000000002', 'Plan B', 100, 30)
on conflict (id) do nothing;

insert into public.student_memberships (id, tenant_id, student_id, plan_id, starts_at, expires_at)
values
  ('20000000-0000-0000-0000-000000000061', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000051', '2026-08-01', '2026-08-31'),
  ('20000000-0000-0000-0000-000000000062', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000052', '2026-08-01', '2026-08-31')
on conflict (id) do nothing;

insert into public.audit_log (tenant_id, actor_id, action, entity_type, entity_id)
values
  ('20000000-0000-0000-0000-000000000001', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', 'student.created', 'student', '20000000-0000-0000-0000-000000000021'),
  ('20000000-0000-0000-0000-000000000002', '810363c9-4041-4ec2-a54a-1508d308e58d', 'student.created', 'student', '20000000-0000-0000-0000-000000000022')
on conflict do nothing;

create function pg_temp.expect_rls_denied(statement text)
returns void language plpgsql
as $$
begin
  begin
    execute statement;
    raise exception 'cross-tenant statement unexpectedly succeeded: %', statement;
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);

-- SELECT, UPDATE, and DELETE: user A can see its fixture in every operational
-- table, while attempts against Tenant B affect no rows.
do $$
declare
  affected_rows integer;
  table_name text;
  visible_rows integer;
begin
  foreach table_name in array array[
    'locations',
    'students',
    'sessions',
    'session_attendance',
    'membership_plans',
    'student_memberships'
  ] loop
    execute format(
      'select count(*) from public.%I where tenant_id in ($1, $2)',
      table_name
    ) into visible_rows using
      '20000000-0000-0000-0000-000000000001'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid;
    if visible_rows <> 1 then
      raise exception '% SELECT exposed % fixture rows instead of 1', table_name, visible_rows;
    end if;

    execute format(
      'update public.%I set tenant_id = tenant_id where tenant_id = $1',
      table_name
    ) using '20000000-0000-0000-0000-000000000002'::uuid;
    get diagnostics affected_rows = row_count;
    if affected_rows <> 0 then
      raise exception 'cross-tenant UPDATE affected % rows in %', affected_rows, table_name;
    end if;

    execute format(
      'delete from public.%I where tenant_id = $1',
      table_name
    ) using '20000000-0000-0000-0000-000000000002'::uuid;
    get diagnostics affected_rows = row_count;
    if affected_rows <> 0 then
      raise exception 'cross-tenant DELETE affected % rows in %', affected_rows, table_name;
    end if;
  end loop;
end;
$$;

select count(*) as audit_entries_visible_to_a
from public.audit_log
where entity_id in (
  '20000000-0000-0000-0000-000000000021',
  '20000000-0000-0000-0000-000000000022'
);
-- Expected: 1 (Tenant A's entry only).

do $$
begin
  if not ('20000000-0000-0000-0000-000000000001'::uuid = any (public.current_tenant_ids())) then
    raise exception 'active membership in an active tenant must grant access';
  end if;
  if '20000000-0000-0000-0000-000000000004'::uuid = any (public.current_tenant_ids()) then
    raise exception 'active membership must not grant access to a suspended tenant';
  end if;
  if '20000000-0000-0000-0000-000000000005'::uuid = any (public.current_tenant_ids()) then
    raise exception 'revoked membership must not grant tenant access';
  end if;
  if public.current_membership_role('20000000-0000-0000-0000-000000000004') is not null then
    raise exception 'suspended tenant must not expose an operational role';
  end if;
  if public.current_membership_role('20000000-0000-0000-0000-000000000005') is not null then
    raise exception 'revoked membership must not expose an operational role';
  end if;
end;
$$;

-- INSERT: user A attempts to create rows under Tenant B in every operational table.
select pg_temp.expect_rls_denied($sql$
  insert into public.locations (tenant_id, name)
  values ('20000000-0000-0000-0000-000000000002', 'Injected location')
$sql$);
select pg_temp.expect_rls_denied($sql$
  insert into public.students (tenant_id, full_name)
  values ('20000000-0000-0000-0000-000000000002', 'Injected student')
$sql$);
select pg_temp.expect_rls_denied($sql$
  insert into public.sessions (tenant_id, location_id, starts_at, ends_at)
  values ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000012', '2026-08-23 10:00:00+00', '2026-08-23 11:00:00+00')
$sql$);
select pg_temp.expect_rls_denied($sql$
  insert into public.session_attendance (tenant_id, session_id, student_id, status)
  values ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000022', 'absent')
$sql$);
select pg_temp.expect_rls_denied($sql$
  insert into public.membership_plans (tenant_id, name, price, duration_days)
  values ('20000000-0000-0000-0000-000000000002', 'Injected plan', 100, 30)
$sql$);
select pg_temp.expect_rls_denied($sql$
  insert into public.student_memberships (tenant_id, student_id, plan_id, starts_at, expires_at)
  values ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000052', '2026-08-01', '2026-08-31')
$sql$);

select set_config('request.jwt.claim.sub', '810363c9-4041-4ec2-a54a-1508d308e58d', true);
select count(*) as students_visible_to_b
from public.students
where id in (
  '20000000-0000-0000-0000-000000000021',
  '20000000-0000-0000-0000-000000000022'
);
-- Expected: 1 (Student B only, confirming A's UPDATE/DELETE attempts did not affect it).

-- Onboarding bootstrap: a brand new, still-memberless tenant can only be claimed by its creator.
select set_config('request.jwt.claim.sub', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
insert into public.tenants (id, name, status, created_by)
values ('20000000-0000-0000-0000-000000000003', 'Tenant C (new)', 'trial', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac');

select set_config('request.jwt.claim.sub', '810363c9-4041-4ec2-a54a-1508d308e58d', true);
do $$
begin
  begin
    insert into public.tenant_memberships (tenant_id, user_id, role, status)
    values ('20000000-0000-0000-0000-000000000003', '810363c9-4041-4ec2-a54a-1508d308e58d', 'owner', 'active');
    raise exception 'cross-user owner claim unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
insert into public.tenant_memberships (tenant_id, user_id, role, status)
values ('20000000-0000-0000-0000-000000000003', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', 'owner', 'active');
-- Expected: success. User A, Tenant C's creator, claims the owner membership.

select count(*) as profiles_visible_to_a from public.profiles where id = '810363c9-4041-4ec2-a54a-1508d308e58d';
-- Expected: 0. User A must not see user B's profile row.

reset role;

do $$
declare
  command_name text;
  table_name text;
begin
  foreach table_name in array array[
    'locations',
    'students',
    'sessions',
    'session_attendance',
    'membership_plans',
    'student_memberships'
  ] loop
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

insert into public.platform_admins (id)
values ('810363c9-4041-4ec2-a54a-1508d308e58d')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

do $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator was not recognized';
  end if;
  if (select count(*) from public.audit_log where entity_id in (
    '20000000-0000-0000-0000-000000000021',
    '20000000-0000-0000-0000-000000000022'
  )) <> 2 then
    raise exception 'platform administrator must see audit entries from both tenants';
  end if;
  if (select count(*) from public.profiles where id in (
    'b262bdc0-d2fc-49e8-9b44-770f3a14bdac',
    '810363c9-4041-4ec2-a54a-1508d308e58d'
  )) <> 2 then
    raise exception 'platform administrator must see both test profiles';
  end if;
end;
$$;

reset role;
rollback;
