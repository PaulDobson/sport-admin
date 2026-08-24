-- Run this in the Supabase SQL Editor after 0001_init.sql.
-- Replace the two user UUIDs with IDs from Authentication > Users before running.
begin;

insert into public.tenants (id, name)
values
  ('10000000-0000-0000-0000-000000000001', 'Tenant A'),
  ('10000000-0000-0000-0000-000000000002', 'Tenant B')
on conflict (id) do nothing;

insert into public.tenant_memberships (tenant_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'owner')
on conflict (tenant_id, user_id) do nothing;

insert into public.students (tenant_id, full_name)
values
  ('10000000-0000-0000-0000-000000000001', 'Student A'),
  ('10000000-0000-0000-0000-000000000002', 'Student B');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select count(*) as visible_students_for_user_a
from public.students;
-- Expected: 1. An INSERT/UPDATE/DELETE using Tenant B's tenant_id affects zero rows
-- or is rejected by RLS.

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select count(*) as visible_students_for_user_b
from public.students;
-- Expected: 1. User B must not see or mutate Tenant A's student.

reset role;
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('tenants', 'tenant_memberships', 'locations', 'students', 'sessions', 'session_attendance', 'membership_plans', 'student_memberships')
order by tablename, policyname;
-- Expected: four policies (SELECT, INSERT, UPDATE, DELETE) per listed table.

rollback;