-- Stage 3: student contacts, archival, and typed external locations.

alter table public.locations
  add column if not exists type text not null default 'external_gym'
    check (type in ('external_gym', 'park', 'home', 'online')),
  add column if not exists status text not null default 'active'
    check (status in ('active', 'archived'));

alter table public.students drop constraint if exists students_status_check;
update public.students set status = 'archived' where status = 'inactive';
alter table public.students
  add constraint students_status_check check (status in ('active', 'archived')),
  add column if not exists archived_at timestamptz;

create table if not exists public.student_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null,
  type text not null check (type in ('email', 'phone', 'emergency')),
  label text,
  value text not null check (length(trim(value)) > 0),
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete cascade
);

create index if not exists students_tenant_status_idx
  on public.students (tenant_id, status, full_name);
create index if not exists locations_tenant_status_type_idx
  on public.locations (tenant_id, status, type);
create index if not exists student_contacts_tenant_student_status_idx
  on public.student_contacts (tenant_id, student_id, status);
create unique index if not exists student_contacts_primary_type_idx
  on public.student_contacts (tenant_id, student_id, type)
  where is_primary and status = 'active';

alter table public.student_contacts enable row level security;

drop policy if exists student_contacts_select on public.student_contacts;
drop policy if exists student_contacts_insert on public.student_contacts;
drop policy if exists student_contacts_update on public.student_contacts;
drop policy if exists student_contacts_delete on public.student_contacts;
create policy student_contacts_select on public.student_contacts for select
  using (tenant_id = any (public.current_tenant_ids()));
create policy student_contacts_insert on public.student_contacts for insert
  with check (tenant_id = any (public.current_tenant_ids()));
create policy student_contacts_update on public.student_contacts for update
  using (tenant_id = any (public.current_tenant_ids()))
  with check (tenant_id = any (public.current_tenant_ids()));
create policy student_contacts_delete on public.student_contacts for delete
  using (tenant_id = any (public.current_tenant_ids()));