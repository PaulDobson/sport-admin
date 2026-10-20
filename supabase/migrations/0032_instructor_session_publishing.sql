create or replace function public.create_one_off_class_session(
  target_tenant_id uuid,
  target_class_template_id uuid,
  target_location_id uuid,
  target_instructor_membership_id uuid,
  target_starts_at_local timestamp without time zone,
  target_ends_at_local timestamp without time zone,
  target_timezone text,
  target_waitlist_enabled boolean default true
)
returns public.class_sessions
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  class_capacity integer;
  archived_schedule_id uuid;
  result public.class_sessions;
begin
  if not public.can_manage_instructor_scope(
    target_tenant_id,
    target_instructor_membership_id
  ) then
    raise exception 'not authorized to publish sessions for this instructor'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = target_tenant_id
      and membership.id = target_instructor_membership_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'instructor')
  ) then
    raise exception 'active instructor membership not found' using errcode = 'P0002';
  end if;
  if target_ends_at_local <= target_starts_at_local then
    raise exception 'session end must be after start' using errcode = '23514';
  end if;
  if length(trim(target_timezone)) = 0 then
    raise exception 'timezone is required' using errcode = '22023';
  end if;

  select template.capacity into class_capacity
  from public.class_templates template
  where template.tenant_id = target_tenant_id
    and template.id = target_class_template_id
    and template.status = 'active';
  if class_capacity is null then
    raise exception 'active class template not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.locations location
    where location.tenant_id = target_tenant_id
      and location.id = target_location_id
      and location.status = 'active'
  ) then
    raise exception 'active location not found' using errcode = 'P0002';
  end if;

  insert into public.class_schedules (
    tenant_id,
    class_template_id,
    location_id,
    instructor_membership_id,
    day_of_week,
    starts_at,
    ends_at,
    timezone,
    allow_conflict,
    status
  ) values (
    target_tenant_id,
    target_class_template_id,
    target_location_id,
    target_instructor_membership_id,
    extract(dow from target_starts_at_local)::smallint,
    target_starts_at_local::time,
    target_ends_at_local::time,
    target_timezone,
    true,
    'archived'
  ) returning id into archived_schedule_id;

  insert into public.class_sessions (
    tenant_id,
    class_schedule_id,
    class_template_id,
    location_id,
    instructor_membership_id,
    starts_at,
    ends_at,
    timezone,
    capacity,
    waitlist_enabled
  ) values (
    target_tenant_id,
    archived_schedule_id,
    target_class_template_id,
    target_location_id,
    target_instructor_membership_id,
    target_starts_at_local at time zone target_timezone,
    target_ends_at_local at time zone target_timezone,
    target_timezone,
    class_capacity,
    target_waitlist_enabled
  ) returning * into result;

  return result;
end;
$$;

create or replace function public.publish_recurring_class_sessions(
  target_tenant_id uuid,
  target_class_schedule_id uuid,
  target_from_date date,
  target_through_date date,
  target_waitlist_enabled boolean default true
)
returns integer
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  source public.class_schedules;
  target_day date;
  local_starts timestamp without time zone;
  local_ends timestamp without time zone;
  published_count integer := 0;
  affected_count integer;
begin
  select * into source
  from public.class_schedules schedule
  where schedule.tenant_id = target_tenant_id
    and schedule.id = target_class_schedule_id
    and schedule.status = 'active';
  if not found then
    raise exception 'active class schedule not found' using errcode = 'P0002';
  end if;
  if not public.can_manage_instructor_scope(
    target_tenant_id,
    source.instructor_membership_id
  ) then
    raise exception 'not authorized to publish this schedule'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = target_tenant_id
      and membership.id = source.instructor_membership_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'instructor')
  ) then
    raise exception 'active instructor membership not found' using errcode = 'P0002';
  end if;
  if target_through_date < target_from_date
    or target_through_date > target_from_date + 56 then
    raise exception 'publication range must be between 0 and 8 weeks'
      using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.class_templates template
    where template.tenant_id = target_tenant_id
      and template.id = source.class_template_id
      and template.status = 'active'
  ) or not exists (
    select 1 from public.locations location
    where location.tenant_id = target_tenant_id
      and location.id = source.location_id
      and location.status = 'active'
  ) then
    raise exception 'schedule template or location is inactive' using errcode = '23514';
  end if;

  for target_day in
    select generated_day
    from generate_series(
      target_from_date::timestamp,
      target_through_date::timestamp,
      interval '1 day'
    ) as generated_dates(generated_day)
  loop
    if extract(dow from target_day)::integer = source.day_of_week then
      local_starts := target_day + source.starts_at;
      local_ends := target_day + source.ends_at;
      if local_ends at time zone source.timezone > now() then
        insert into public.class_sessions (
          tenant_id,
          class_schedule_id,
          class_template_id,
          location_id,
          instructor_membership_id,
          starts_at,
          ends_at,
          timezone,
          capacity,
          waitlist_enabled
        )
        select
          target_tenant_id,
          source.id,
          source.class_template_id,
          source.location_id,
          source.instructor_membership_id,
          local_starts at time zone source.timezone,
          local_ends at time zone source.timezone,
          source.timezone,
          template.capacity,
          target_waitlist_enabled
        from public.class_templates template
        where template.tenant_id = target_tenant_id
          and template.id = source.class_template_id
        on conflict (tenant_id, class_schedule_id, starts_at) do update
          set ends_at = excluded.ends_at,
              waitlist_enabled = excluded.waitlist_enabled;
        get diagnostics affected_count = row_count;
        published_count := published_count + affected_count;
      end if;
    end if;
  end loop;

  return published_count;
end;
$$;

revoke all on function public.create_one_off_class_session(uuid, uuid, uuid, uuid, timestamp without time zone, timestamp without time zone, text, boolean) from public;
revoke all on function public.publish_recurring_class_sessions(uuid, uuid, date, date, boolean) from public;
grant execute on function public.create_one_off_class_session(uuid, uuid, uuid, uuid, timestamp without time zone, timestamp without time zone, text, boolean) to authenticated;
grant execute on function public.publish_recurring_class_sessions(uuid, uuid, date, date, boolean) to authenticated;
