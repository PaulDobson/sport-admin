-- Stage 3: role and assignment-aware permissions for instructor operations.

create table if not exists public.assistant_instructor_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  assistant_membership_id uuid not null,
  instructor_membership_id uuid not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, assistant_membership_id, instructor_membership_id),
  check (assistant_membership_id <> instructor_membership_id),
  foreign key (tenant_id, assistant_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete cascade,
  foreign key (tenant_id, instructor_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete cascade
);

create index if not exists assistant_instructor_assignments_lookup_idx
  on public.assistant_instructor_assignments (
    tenant_id,
    assistant_membership_id,
    instructor_membership_id,
    status
  );

create or replace function public.validate_assistant_instructor_assignment()
returns trigger language plpgsql set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = new.tenant_id
      and membership.id = new.assistant_membership_id
      and membership.role = 'assistant'
      and membership.status = 'active'
  ) then
    raise exception 'active assistant membership not found' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = new.tenant_id
      and membership.id = new.instructor_membership_id
      and membership.role = 'instructor'
      and membership.status = 'active'
  ) then
    raise exception 'active instructor membership not found' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_assistant_instructor_assignment
  on public.assistant_instructor_assignments;
create trigger validate_assistant_instructor_assignment
  before insert or update on public.assistant_instructor_assignments
  for each row execute function public.validate_assistant_instructor_assignment();

create or replace function public.current_membership_id(target_tenant uuid)
returns uuid language sql stable security definer set search_path = public
as $$
  select membership.id
  from public.tenant_memberships membership
  join public.tenants tenant on tenant.id = membership.tenant_id
  where membership.tenant_id = target_tenant
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and tenant.status in ('trial', 'active')
  limit 1;
$$;

create or replace function public.can_read_instructor_operations(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.current_membership_role(target_tenant)
    in ('owner', 'admin', 'instructor', 'assistant');
$$;

create or replace function public.can_manage_student_records(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.current_membership_role(target_tenant)
    in ('owner', 'admin', 'instructor');
$$;

create or replace function public.can_view_instructor_scope(
  target_tenant uuid,
  target_instructor_membership uuid
)
returns boolean language sql stable security definer set search_path = public
as $$
  select case public.current_membership_role(target_tenant)
    when 'owner' then true
    when 'admin' then true
    when 'instructor' then
      public.current_membership_id(target_tenant) = target_instructor_membership
    when 'assistant' then exists (
      select 1
      from public.assistant_instructor_assignments assignment
      join public.tenant_memberships instructor
        on instructor.tenant_id = assignment.tenant_id
       and instructor.id = assignment.instructor_membership_id
       and instructor.role = 'instructor'
       and instructor.status = 'active'
      where assignment.tenant_id = target_tenant
        and assignment.assistant_membership_id = public.current_membership_id(target_tenant)
        and assignment.instructor_membership_id = target_instructor_membership
        and assignment.status = 'active'
    )
    else false
  end;
$$;

create or replace function public.can_manage_instructor_scope(
  target_tenant uuid,
  target_instructor_membership uuid
)
returns boolean language sql stable security definer set search_path = public
as $$
  select case public.current_membership_role(target_tenant)
    when 'owner' then true
    when 'admin' then true
    when 'instructor' then
      public.current_membership_id(target_tenant) = target_instructor_membership
    else false
  end;
$$;

create or replace function public.can_manage_session_enrollments(
  target_tenant uuid,
  target_session uuid
)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.class_sessions session
    where session.tenant_id = target_tenant
      and session.id = target_session
      and public.can_view_instructor_scope(
        session.tenant_id,
        session.instructor_membership_id
      )
  );
$$;

revoke all on function public.current_membership_id(uuid) from public;
revoke all on function public.can_read_instructor_operations(uuid) from public;
revoke all on function public.can_manage_student_records(uuid) from public;
revoke all on function public.can_view_instructor_scope(uuid, uuid) from public;
revoke all on function public.can_manage_instructor_scope(uuid, uuid) from public;
revoke all on function public.can_manage_session_enrollments(uuid, uuid) from public;
grant execute on function public.current_membership_id(uuid) to authenticated;
grant execute on function public.can_read_instructor_operations(uuid) to authenticated;
grant execute on function public.can_manage_student_records(uuid) to authenticated;
grant execute on function public.can_view_instructor_scope(uuid, uuid) to authenticated;
grant execute on function public.can_manage_instructor_scope(uuid, uuid) to authenticated;
grant execute on function public.can_manage_session_enrollments(uuid, uuid) to authenticated;

alter table public.assistant_instructor_assignments enable row level security;

drop policy if exists assistant_instructor_assignments_select
  on public.assistant_instructor_assignments;
drop policy if exists assistant_instructor_assignments_insert
  on public.assistant_instructor_assignments;
drop policy if exists assistant_instructor_assignments_update
  on public.assistant_instructor_assignments;
drop policy if exists assistant_instructor_assignments_delete
  on public.assistant_instructor_assignments;
create policy assistant_instructor_assignments_select
  on public.assistant_instructor_assignments for select
  using (
    public.current_membership_role(tenant_id) in ('owner', 'admin')
    or assistant_membership_id = public.current_membership_id(tenant_id)
    or instructor_membership_id = public.current_membership_id(tenant_id)
  );
create policy assistant_instructor_assignments_insert
  on public.assistant_instructor_assignments for insert
  with check (public.current_membership_role(tenant_id) in ('owner', 'admin'));
create policy assistant_instructor_assignments_update
  on public.assistant_instructor_assignments for update
  using (public.current_membership_role(tenant_id) in ('owner', 'admin'))
  with check (public.current_membership_role(tenant_id) in ('owner', 'admin'));
create policy assistant_instructor_assignments_delete
  on public.assistant_instructor_assignments for delete
  using (public.current_membership_role(tenant_id) in ('owner', 'admin'));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'students',
    'student_contacts',
    'locations',
    'disciplines',
    'class_templates'
  ] loop
    execute format('drop policy if exists %I_select on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_delete on public.%I', table_name, table_name);
    execute format(
      'create policy %I_select on public.%I for select using (public.can_read_instructor_operations(tenant_id))',
      table_name,
      table_name
    );
    execute format(
      'create policy %I_insert on public.%I for insert with check (public.can_manage_student_records(tenant_id))',
      table_name,
      table_name
    );
    execute format(
      'create policy %I_update on public.%I for update using (public.can_manage_student_records(tenant_id)) with check (public.can_manage_student_records(tenant_id))',
      table_name,
      table_name
    );
    execute format(
      'create policy %I_delete on public.%I for delete using (public.can_manage_student_records(tenant_id))',
      table_name,
      table_name
    );
  end loop;
end;
$$;

drop policy if exists class_schedules_select on public.class_schedules;
drop policy if exists class_schedules_insert on public.class_schedules;
drop policy if exists class_schedules_update on public.class_schedules;
drop policy if exists class_schedules_delete on public.class_schedules;
create policy class_schedules_select on public.class_schedules for select
  using (public.can_view_instructor_scope(tenant_id, instructor_membership_id));
create policy class_schedules_insert on public.class_schedules for insert
  with check (public.can_manage_instructor_scope(tenant_id, instructor_membership_id));
create policy class_schedules_update on public.class_schedules for update
  using (public.can_manage_instructor_scope(tenant_id, instructor_membership_id))
  with check (public.can_manage_instructor_scope(tenant_id, instructor_membership_id));
create policy class_schedules_delete on public.class_schedules for delete
  using (public.can_manage_instructor_scope(tenant_id, instructor_membership_id));

drop policy if exists class_sessions_select on public.class_sessions;
drop policy if exists class_sessions_insert on public.class_sessions;
drop policy if exists class_sessions_update on public.class_sessions;
drop policy if exists class_sessions_delete on public.class_sessions;
create policy class_sessions_select on public.class_sessions for select
  using (public.can_view_instructor_scope(tenant_id, instructor_membership_id));
create policy class_sessions_insert on public.class_sessions for insert
  with check (public.can_manage_instructor_scope(tenant_id, instructor_membership_id));
create policy class_sessions_update on public.class_sessions for update
  using (public.can_manage_instructor_scope(tenant_id, instructor_membership_id))
  with check (public.can_manage_instructor_scope(tenant_id, instructor_membership_id));
create policy class_sessions_delete on public.class_sessions for delete
  using (public.can_manage_instructor_scope(tenant_id, instructor_membership_id));

drop policy if exists session_enrollments_select on public.session_enrollments;
drop policy if exists session_enrollments_insert on public.session_enrollments;
drop policy if exists session_enrollments_update on public.session_enrollments;
drop policy if exists session_enrollments_delete on public.session_enrollments;
create policy session_enrollments_select on public.session_enrollments for select
  using (public.can_manage_session_enrollments(tenant_id, session_id));
create policy session_enrollments_insert on public.session_enrollments for insert
  with check (public.can_manage_session_enrollments(tenant_id, session_id));
create policy session_enrollments_update on public.session_enrollments for update
  using (public.can_manage_session_enrollments(tenant_id, session_id))
  with check (public.can_manage_session_enrollments(tenant_id, session_id));
create policy session_enrollments_delete on public.session_enrollments for delete
  using (public.can_manage_session_enrollments(tenant_id, session_id));