-- Stage 3: concrete class sessions and capacity-aware enrollments.

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  class_schedule_id uuid not null,
  class_template_id uuid not null,
  location_id uuid not null,
  instructor_membership_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null check (length(trim(timezone)) > 0),
  capacity integer not null check (capacity > 0),
  waitlist_enabled boolean not null default true,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (tenant_id, id),
  unique (tenant_id, class_schedule_id, starts_at),
  foreign key (tenant_id, class_schedule_id)
    references public.class_schedules(tenant_id, id) on delete restrict,
  foreign key (tenant_id, class_template_id)
    references public.class_templates(tenant_id, id) on delete restrict,
  foreign key (tenant_id, location_id)
    references public.locations(tenant_id, id) on delete restrict,
  foreign key (tenant_id, instructor_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete restrict
);

create table if not exists public.session_enrollments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id uuid not null,
  student_id uuid not null,
  status text not null check (status in ('confirmed', 'waitlisted', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, session_id, student_id),
  foreign key (tenant_id, session_id)
    references public.class_sessions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete restrict
);

create index if not exists class_sessions_tenant_start_idx
  on public.class_sessions (tenant_id, starts_at, status);
create index if not exists class_sessions_instructor_start_idx
  on public.class_sessions (tenant_id, instructor_membership_id, starts_at);
create index if not exists session_enrollments_session_status_idx
  on public.session_enrollments (tenant_id, session_id, status, created_at);
create index if not exists session_enrollments_student_idx
  on public.session_enrollments (tenant_id, student_id, status);

create or replace function public.set_session_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_class_sessions_updated_at
  before update on public.class_sessions
  for each row execute function public.set_session_updated_at();
create trigger set_session_enrollments_updated_at
  before update on public.session_enrollments
  for each row execute function public.set_session_updated_at();

create or replace function public.enforce_session_capacity()
returns trigger language plpgsql set search_path = public
as $$
declare
  confirmed_count integer;
begin
  if new.capacity < old.capacity then
    select count(*) into confirmed_count
    from public.session_enrollments
    where tenant_id = new.tenant_id
      and session_id = new.id
      and status = 'confirmed';
    if new.capacity < confirmed_count then
      raise exception 'session capacity cannot be lower than confirmed enrollments'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_session_capacity
  before update of capacity on public.class_sessions
  for each row execute function public.enforce_session_capacity();

create or replace function public.generate_class_session(
  target_tenant_id uuid,
  target_schedule_id uuid,
  target_starts_at timestamptz,
  target_ends_at timestamptz,
  target_waitlist_enabled boolean default true
)
returns public.class_sessions
language plpgsql
set search_path = public
as $$
declare
  source record;
  result public.class_sessions;
begin
  select schedule.class_template_id,
         schedule.location_id,
         schedule.instructor_membership_id,
         schedule.timezone,
         template.capacity
    into source
  from public.class_schedules schedule
  join public.class_templates template
    on template.tenant_id = schedule.tenant_id
   and template.id = schedule.class_template_id
  join public.locations location
    on location.tenant_id = schedule.tenant_id
   and location.id = schedule.location_id
   and location.status = 'active'
  where schedule.tenant_id = target_tenant_id
    and schedule.id = target_schedule_id
    and schedule.status = 'active'
    and template.status = 'active';

  if not found then
    raise exception 'active schedule not found' using errcode = 'P0002';
  end if;
  if target_ends_at <= target_starts_at then
    raise exception 'session end must be after start' using errcode = '23514';
  end if;

  insert into public.class_sessions (
    tenant_id, class_schedule_id, class_template_id, location_id,
    instructor_membership_id, starts_at, ends_at, timezone, capacity,
    waitlist_enabled
  ) values (
    target_tenant_id, target_schedule_id, source.class_template_id,
    source.location_id, source.instructor_membership_id, target_starts_at,
    target_ends_at, source.timezone, source.capacity, target_waitlist_enabled
  )
  on conflict (tenant_id, class_schedule_id, starts_at) do update
    set ends_at = excluded.ends_at
  returning * into result;
  return result;
end;
$$;

create or replace function public.enroll_student_in_session(
  target_tenant_id uuid,
  target_session_id uuid,
  target_student_id uuid
)
returns public.session_enrollments
language plpgsql
set search_path = public
as $$
declare
  target_session public.class_sessions;
  confirmed_count integer;
  enrollment_status text;
  result public.session_enrollments;
begin
  select * into target_session
  from public.class_sessions
  where tenant_id = target_tenant_id and id = target_session_id
  for update;

  if not found or target_session.status <> 'scheduled' then
    raise exception 'session is not open for enrollment' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.students
    where tenant_id = target_tenant_id
      and id = target_student_id
      and status = 'active'
  ) then
    raise exception 'active student not found' using errcode = 'P0002';
  end if;

  select count(*) into confirmed_count
  from public.session_enrollments
  where tenant_id = target_tenant_id
    and session_id = target_session_id
    and status = 'confirmed';

  if confirmed_count >= target_session.capacity and not target_session.waitlist_enabled then
    raise exception 'session capacity is full' using errcode = '23514';
  end if;
  enrollment_status := case
    when confirmed_count < target_session.capacity then 'confirmed'
    else 'waitlisted'
  end;

  insert into public.session_enrollments (tenant_id, session_id, student_id, status)
  values (target_tenant_id, target_session_id, target_student_id, enrollment_status)
  on conflict (tenant_id, session_id, student_id) do update
    set status = case
      when session_enrollments.status = 'cancelled' then excluded.status
      else session_enrollments.status
    end
  returning * into result;
  return result;
end;
$$;

create or replace function public.cancel_session_enrollment(
  target_tenant_id uuid,
  target_session_id uuid,
  target_student_id uuid
)
returns public.session_enrollments
language plpgsql
set search_path = public
as $$
declare
  result public.session_enrollments;
  previous_status text;
begin
  select status into previous_status
  from public.session_enrollments
  where tenant_id = target_tenant_id
    and session_id = target_session_id
    and student_id = target_student_id
    and status <> 'cancelled'
  for update;

  if not found then
    raise exception 'active session enrollment not found' using errcode = 'P0002';
  end if;

  update public.session_enrollments
  set status = 'cancelled'
  where tenant_id = target_tenant_id
    and session_id = target_session_id
    and student_id = target_student_id
    and status <> 'cancelled'
  returning * into result;

  if previous_status = 'confirmed' then
    update public.session_enrollments
    set status = 'confirmed'
    where id = (
      select id
      from public.session_enrollments
      where tenant_id = target_tenant_id
        and session_id = target_session_id
        and status = 'waitlisted'
      order by created_at, id
      limit 1
      for update skip locked
    );
  end if;
  return result;
end;
$$;

alter table public.class_sessions enable row level security;
alter table public.session_enrollments enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['class_sessions', 'session_enrollments'] loop
    execute format('create policy %I_select on public.%I for select using (tenant_id = any (public.current_tenant_ids()))', table_name, table_name);
    execute format('create policy %I_insert on public.%I for insert with check (tenant_id = any (public.current_tenant_ids()))', table_name, table_name);
    execute format('create policy %I_update on public.%I for update using (tenant_id = any (public.current_tenant_ids())) with check (tenant_id = any (public.current_tenant_ids()))', table_name, table_name);
    execute format('create policy %I_delete on public.%I for delete using (tenant_id = any (public.current_tenant_ids()))', table_name, table_name);
  end loop;
end;
$$;