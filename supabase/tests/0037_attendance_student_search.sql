-- Standalone search regression with a minimal students fixture; always rolls back.
-- Run in a disposable PostgreSQL database, not against application tables.
begin;
create table public.students (id uuid, tenant_id uuid, full_name text, status text);
create role authenticated;
\ir ../migrations/0037_attendance_student_search.sql

insert into public.students
select md5(n::text)::uuid, '10000000-0000-4000-8000-000000000001', 'José Alumno ' || n, 'active'
from generate_series(1, 230) n;
insert into public.students values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'José Soto', 'active'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Ana María Pérez Soto', 'active'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'José Archivado', 'archived'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'José Externo', 'active');

do $$
begin
  if (select count(*) from public.search_attendance_students('10000000-0000-4000-8000-000000000001', 'jose', 1)) <> 20 then
    raise exception 'Expected bounded first page';
  end if;
  if (select max(total_count) from public.search_attendance_students('10000000-0000-4000-8000-000000000001', 'JOSE', 1)) <> 231 then
    raise exception 'Expected accent/case folding, active and tenant scope';
  end if;
  if (select count(*) from public.search_attendance_students('10000000-0000-4000-8000-000000000001', 'jose', 12)) <> 11 then
    raise exception 'Expected final page of large roster';
  end if;
  if (select student_name from public.search_attendance_students('10000000-0000-4000-8000-000000000001', 'ana soto', 1)) <> 'Ana María Pérez Soto' then
    raise exception 'Expected non-contiguous name matching';
  end if;
  if (select student_name from public.search_attendance_students('10000000-0000-4000-8000-000000000001', 'jose soto', 1) limit 1) <> 'José Soto' then
    raise exception 'Expected exact match first';
  end if;
end;
$$;
alter table public.students enable row level security;
grant select on public.students to authenticated;
create policy test_academy_scope on public.students for select to authenticated
using (tenant_id = '10000000-0000-4000-8000-000000000001');
set local role authenticated;
do $$
begin
  if exists (select 1 from public.search_attendance_students('10000000-0000-4000-8000-000000000002', 'jose', 1)) then
    raise exception 'Invoker search must honor student RLS';
  end if;
  if (select count(*) from public.search_attendance_students('10000000-0000-4000-8000-000000000001', 'jose', 1)) <> 20 then
    raise exception 'Authorized academy should remain searchable';
  end if;
end;
$$;
rollback;
