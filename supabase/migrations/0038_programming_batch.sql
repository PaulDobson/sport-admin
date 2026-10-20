-- One transaction for validation, preview and publication. No table/model changes.
create or replace function public.programming_batch_row_uuid(value text)
returns uuid language sql immutable strict
set search_path = public, pg_temp
as $$
  -- RFC 9562 custom UUIDv8: stable hashed name with valid version/variant bits.
  select overlay(overlay(md5(value) placing '8' from 13) placing '8' from 17)::uuid;
$$;
revoke all on function public.programming_batch_row_uuid(text) from public;

create or replace function public.program_class_batch(
  target_tenant_id uuid,
  target_instructor_membership_id uuid,
  target_programming jsonb,
  target_intent text,
  target_commit boolean,
  target_preview_fingerprint text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_variable
declare
  p jsonb := target_programming;
  slot jsonb;
  i integer;
  j integer;
  operation_id uuid;
  template_id uuid;
  zone text;
  mode text;
  first_day date;
  last_day date;
  day date;
  end_day date;
  dow integer;
  start_clock time;
  end_clock time;
  local_start timestamp;
  local_end timestamp;
  instant_start timestamptz;
  instant_end timestamptz;
  location_id uuid;
  schedule_id uuid;
  receipt_id uuid;
  effective_id uuid;
  payload_hash text;
  session_id uuid;
  capacity integer;
  waitlist boolean;
  allow_conflict boolean;
  occurrences jsonb := '[]';
  conflicts jsonb := '[]';
  schedules jsonb := '[]';
  occurrence jsonb;
  other jsonb;
  fingerprint text;
  new_count integer := 0;
  existing_count integer := 0;
  affected integer;
  stored public.class_schedules;
  stored_session public.class_sessions;
  conflict record;
begin
  -- Serialize before checking current membership so a queued call cannot use
  -- authorization or active input state observed before waiting for the lock.
  perform pg_advisory_xact_lock(hashtextextended(target_tenant_id::text || ':' || target_instructor_membership_id::text, 38));
  perform 1 from public.tenant_memberships m where m.tenant_id = target_tenant_id
    and (m.id = target_instructor_membership_id or m.user_id = auth.uid()) for share;
  if not exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = target_tenant_id and m.id = target_instructor_membership_id
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'instructor')
  ) or not public.can_manage_instructor_scope(target_tenant_id, target_instructor_membership_id) then
    raise exception 'Tu perfil no puede modificar esta programación.' using errcode = '42501';
  end if;
  if jsonb_typeof(p) is distinct from 'object'
    or target_intent is null or target_intent not in ('save', 'publish')
    or target_commit is null
    or jsonb_typeof(p->'slots') is distinct from 'array'
    or jsonb_typeof(p->'waitlistEnabled') is distinct from 'boolean'
    or jsonb_typeof(p->'allowConflict') is distinct from 'boolean'
    or coalesce(p->>'mode', '') not in ('weekly', 'once')
    or coalesce(p->>'fromDate', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or coalesce(p->>'throughDate', '') !~ '^\d{4}-\d{2}-\d{2}$'
  then raise exception 'La programación no es válida.' using errcode = '22023'; end if;
  if jsonb_array_length(p->'slots') not between 1 and 28 then
    raise exception 'Selecciona entre 1 y 28 bloques.' using errcode = '22023';
  end if;
  operation_id := (p->>'operationId')::uuid;
  perform pg_advisory_xact_lock(hashtextextended(operation_id::text, 39));
  template_id := (p->>'classTemplateId')::uuid;
  zone := p->>'timezone';
  mode := p->>'mode';
  first_day := (p->>'fromDate')::date;
  last_day := (p->>'throughDate')::date;
  waitlist := (p->>'waitlistEnabled')::boolean;
  allow_conflict := (p->>'allowConflict')::boolean;
  payload_hash := md5((p - 'allowConflict')::text || target_intent);
  if operation_id is null or template_id is null
    or not exists (select 1 from pg_timezone_names where name = zone)
    or last_day < first_day or last_day - first_day > 56
    or (target_intent = 'save' and mode <> 'weekly')
    or (p ? 'instructorMembershipId' and (p->>'instructorMembershipId')::uuid is distinct from target_instructor_membership_id)
  then raise exception 'Revisa la zona horaria y el rango (máximo 56 días).' using errcode = '22023'; end if;
  select t.capacity into capacity from public.class_templates t
    where t.tenant_id = target_tenant_id and t.id = template_id and t.status = 'active' for share;
  if capacity is null then raise exception 'La clase ya no está activa.' using errcode = 'P0002'; end if;

  for slot, i in select value, ordinality::integer - 1 from jsonb_array_elements(p->'slots') with ordinality loop
    if jsonb_typeof(slot) is distinct from 'object'
      or coalesce(slot->>'dayOfWeek', '') !~ '^[0-6]$'
      or coalesce(slot->>'startsAt', '') !~ '^([01]\d|2[0-3]):[0-5]\d$'
      or coalesce(slot->>'endsAt', '') !~ '^([01]\d|2[0-3]):[0-5]\d$'
    then raise exception 'Revisa los días y horas de cada bloque.' using errcode = '22023'; end if;
    dow := (slot->>'dayOfWeek')::integer;
    start_clock := (slot->>'startsAt')::time;
    end_clock := (slot->>'endsAt')::time;
    location_id := (slot->>'locationId')::uuid;
    perform 1 from public.locations l where l.tenant_id = target_tenant_id
      and l.id = location_id and l.status = 'active' for share;
    if not found then
      raise exception 'La ubicación ya no está activa.' using errcode = 'P0002';
    end if;
    if mode = 'weekly' and end_clock <= start_clock then
      raise exception 'La hora de término debe ser posterior al inicio.' using errcode = '22023';
    end if;
    if mode = 'once' then
      if coalesce(slot->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$'
        or coalesce(slot->>'endDate', '') !~ '^\d{4}-\d{2}-\d{2}$' then
        raise exception 'La sesión única necesita fecha de inicio y término.' using errcode = '22023';
      end if;
      day := (slot->>'date')::date;
      end_day := (slot->>'endDate')::date;
      if day < first_day or end_day > last_day or end_day + end_clock <= day + start_clock then
        raise exception 'Las fechas de la sesión única no son válidas.' using errcode = '22023';
      end if;
    end if;
    schedule_id := public.programming_batch_row_uuid(operation_id::text || ':schedule:' || i);
    -- For overnight one-offs the archived backing rule is not a recurring time rule.
    receipt_id := public.programming_batch_row_uuid(operation_id::text || ':payload:' || i || ':' || payload_hash);
    if exists (select 1 from public.class_schedules s where s.id = receipt_id
      and (s.tenant_id <> target_tenant_id or s.instructor_membership_id <> target_instructor_membership_id
        or s.class_template_id <> template_id or s.location_id <> location_id or s.timezone <> zone)) then
      raise exception 'El identificador de operación ya fue utilizado.' using errcode = '22023';
    end if;
    select * into stored from public.class_schedules s where s.id = schedule_id;
    if found and (stored.tenant_id <> target_tenant_id or stored.class_template_id <> template_id
      or stored.instructor_membership_id <> target_instructor_membership_id or stored.location_id <> location_id
      or stored.day_of_week <> dow or stored.timezone <> zone
      or stored.starts_at <> case when mode = 'once' then '00:00:00'::time else start_clock end
      or stored.ends_at <> case when mode = 'once' then '23:59:59'::time else end_clock end
      or stored.status <> 'archived'
      or not exists (select 1 from public.class_schedules s where s.id = receipt_id and s.tenant_id = target_tenant_id
        and s.instructor_membership_id = target_instructor_membership_id)) then
      raise exception 'El identificador de operación ya fue utilizado con otros datos.' using errcode = '22023';
    end if;
    -- Two valid rule rows provide a durable receipt without a new table/column:
    -- fixed operation/slot UUID + payload-derived UUID. Neither is ever updated.
    effective_id := null;
    if mode = 'weekly' then
      select s.id into effective_id from public.class_schedules s
      where s.tenant_id = target_tenant_id and s.instructor_membership_id = target_instructor_membership_id
        and s.class_template_id = template_id and s.location_id = location_id and s.status = 'active'
        and s.day_of_week = dow and s.starts_at = start_clock and s.ends_at = end_clock and s.timezone = zone
      order by s.created_at, s.id limit 1;
    end if;
    effective_id := coalesce(effective_id, receipt_id);
    schedules := schedules || jsonb_build_array(jsonb_build_object(
      'id', receipt_id, 'guardId', schedule_id, 'effectiveId', effective_id,
      'locationId', location_id, 'dayOfWeek', dow,
      'startsAt', case when mode = 'once' then '00:00:00' else start_clock::text end,
      'endsAt', case when mode = 'once' then '23:59:59' else end_clock::text end,
      'status', case when mode = 'weekly' and effective_id = receipt_id then 'active' else 'archived' end
    ));
    for day in select generated::date from generate_series(first_day::timestamp, last_day::timestamp, interval '1 day') generated loop
      if (mode = 'weekly' and extract(dow from day)::integer <> dow)
        or (mode = 'once' and day <> (slot->>'date')::date) then continue; end if;
      end_day := case when mode = 'once' then (slot->>'endDate')::date else day end;
      local_start := day + start_clock;
      local_end := end_day + end_clock;
      instant_start := local_start at time zone zone;
      instant_end := local_end at time zone zone;
      -- PostgreSQL normally silently normalizes nonexistent local DST times.
      if instant_start at time zone zone <> local_start or instant_end at time zone zone <> local_end then
        raise exception 'El bloque % %–% no existe en % por el cambio de hora.', day, start_clock, end_clock, zone using errcode = '22023';
      end if;
      if instant_end <= instant_start then raise exception 'La sesión debe terminar después de su inicio.' using errcode = '22023'; end if;
      -- Stable by reused rule + original date, so moving a published session
      -- to another day does not recreate its original occurrence on republish.
      session_id := public.programming_batch_row_uuid(effective_id::text || ':occurrence:' || day::text);
      if exists (select 1 from jsonb_array_elements(occurrences) o
        where (o->>'startsAt')::timestamptz = instant_start
          and (o->>'endsAt')::timestamptz = instant_end
          and (o->>'locationId')::uuid = location_id) then
        raise exception 'Hay bloques duplicados. Conserva solo uno de cada horario y ubicación.' using errcode = '22023';
      end if;
      select * into stored_session from public.class_sessions s where s.id = session_id;
      if found and (stored_session.tenant_id <> target_tenant_id
        or stored_session.instructor_membership_id <> target_instructor_membership_id) then
        raise exception 'El identificador de sesión ya fue utilizado.' using errcode = '22023';
      end if;
      occurrences := occurrences || jsonb_build_array(jsonb_build_object(
        'id', session_id, 'scheduleId', effective_id, 'startsAt', instant_start,
        'endsAt', instant_end, 'locationId', location_id, 'slotIndex', i
      ));
    end loop;
  end loop;
  -- Reject truncated/reordered retries, including dates that previously produced sessions.
  for j in 0..27 loop
    schedule_id := public.programming_batch_row_uuid(operation_id::text || ':schedule:' || j);
    if j >= jsonb_array_length(p->'slots') and exists (select 1 from public.class_schedules s where s.id = schedule_id) then
      raise exception 'El identificador de operación ya fue utilizado con otros bloques.' using errcode = '22023';
    end if;
  end loop;

  for occurrence in select value from jsonb_array_elements(occurrences) loop
    instant_start := (occurrence->>'startsAt')::timestamptz;
    instant_end := (occurrence->>'endsAt')::timestamptz;
    if instant_end <= now() then continue; end if;
    select * into stored_session from public.class_sessions s
    where s.tenant_id = target_tenant_id and (
      s.id = (occurrence->>'id')::uuid
      or (s.class_schedule_id = (occurrence->>'scheduleId')::uuid
        and (s.starts_at at time zone zone)::date = (instant_start at time zone zone)::date)
      or (
        s.instructor_membership_id = target_instructor_membership_id and s.class_template_id = template_id
        and s.location_id = (occurrence->>'locationId')::uuid and s.starts_at = instant_start
        and s.ends_at = instant_end and s.timezone = zone
      ))
    order by (s.id = (occurrence->>'id')::uuid) desc limit 1;
    if found then existing_count := existing_count + 1;
    else new_count := new_count + 1;
    end if;
    for conflict in
      select s.id, s.starts_at, s.ends_at, l.name as location_name, t.name as class_name, 'sesión' as kind
      from public.class_sessions s
      join public.locations l on l.tenant_id = s.tenant_id and l.id = s.location_id
      join public.class_templates t on t.tenant_id = s.tenant_id and t.id = s.class_template_id
      where s.tenant_id = target_tenant_id and s.instructor_membership_id = target_instructor_membership_id
        and s.status = 'scheduled' and s.ends_at > now()
        and s.starts_at < instant_end and instant_start < s.ends_at
        and s.id is distinct from stored_session.id
        and not exists (select 1 from jsonb_array_elements(occurrences) own where (own->>'id')::uuid = s.id)
      union all
      select s.id, (d.day::date + s.starts_at) at time zone s.timezone,
        (d.day::date + s.ends_at) at time zone s.timezone, l.name, t.name, 'horario'
      from public.class_schedules s
      join public.locations l on l.tenant_id = s.tenant_id and l.id = s.location_id
      join public.class_templates t on t.tenant_id = s.tenant_id and t.id = s.class_template_id
      cross join lateral generate_series(
        ((instant_start at time zone s.timezone)::date - 1)::timestamp,
        ((instant_end at time zone s.timezone)::date + 1)::timestamp, interval '1 day') d(day)
      where s.tenant_id = target_tenant_id and s.instructor_membership_id = target_instructor_membership_id
        and s.status = 'active' and extract(dow from d.day)::integer = s.day_of_week
        and not exists (select 1 from jsonb_array_elements(schedules) own where (own->>'id')::uuid = s.id)
        and (d.day::date + s.starts_at) at time zone s.timezone < instant_end
        and instant_start < (d.day::date + s.ends_at) at time zone s.timezone
        and not (s.class_template_id = template_id and s.location_id = (occurrence->>'locationId')::uuid
          and (d.day::date + s.starts_at) at time zone s.timezone = instant_start
          and (d.day::date + s.ends_at) at time zone s.timezone = instant_end)
        -- An individually edited/cancelled occurrence supersedes the rule on that date.
        and not exists (select 1 from public.class_sessions concrete
          where concrete.tenant_id = s.tenant_id and concrete.class_schedule_id = s.id
            and (concrete.starts_at at time zone s.timezone)::date = d.day::date)
    loop
      conflicts := conflicts || jsonb_build_array(jsonb_build_object('message', format(
        'Cruce con %s %s (%s), %s–%s; bloque solicitado %s–%s (%s).',
        conflict.kind, conflict.class_name, conflict.location_name,
        to_char(conflict.starts_at at time zone zone, 'YYYY-MM-DD HH24:MI'),
        to_char(conflict.ends_at at time zone zone, 'YYYY-MM-DD HH24:MI'),
        to_char(instant_start at time zone zone, 'YYYY-MM-DD HH24:MI'),
        to_char(instant_end at time zone zone, 'YYYY-MM-DD HH24:MI'), zone)));
    end loop;
    for other in select value from jsonb_array_elements(occurrences) loop
      if (other->>'slotIndex')::integer <= (occurrence->>'slotIndex')::integer then continue; end if;
      if (other->>'startsAt')::timestamptz < instant_end and instant_start < (other->>'endsAt')::timestamptz then
        conflicts := conflicts || jsonb_build_array(jsonb_build_object('message', format(
          'Los bloques solicitados %s y %s se cruzan el %s (%s–%s).',
          (occurrence->>'slotIndex')::integer + 1, (other->>'slotIndex')::integer + 1,
          to_char(instant_start at time zone zone, 'YYYY-MM-DD'),
          to_char(instant_start at time zone zone, 'HH24:MI'), to_char(instant_end at time zone zone, 'HH24:MI'))));
      end if;
    end loop;
  end loop;
  select coalesce(jsonb_agg(distinct value order by value), '[]') into conflicts from jsonb_array_elements(conflicts);
  -- Confirmation flag is excluded so a reviewed conflict can be explicitly accepted.
  fingerprint := md5((p - 'allowConflict')::text || target_intent || conflicts::text);
  if target_commit then
    if target_preview_fingerprint is distinct from fingerprint then
      raise exception 'La programación cambió. Revisa nuevamente antes de confirmar.' using errcode = '22023';
    end if;
    if jsonb_array_length(conflicts) > 0 and not allow_conflict then
      raise exception 'Hay cruces de horario. Revisa los detalles y confirma explícitamente.' using errcode = '23514';
    end if;
    for slot in select value from jsonb_array_elements(schedules) loop
      -- The legacy wall-clock trigger cannot compare zones. Conflicts were checked above.
      insert into public.class_schedules(id, tenant_id, class_template_id, location_id,
        instructor_membership_id, day_of_week, starts_at, ends_at, timezone, allow_conflict, status)
      values ((slot->>'id')::uuid, target_tenant_id, template_id, (slot->>'locationId')::uuid,
        target_instructor_membership_id, (slot->>'dayOfWeek')::smallint, (slot->>'startsAt')::time,
        (slot->>'endsAt')::time, zone, true, slot->>'status')
      on conflict (id) do nothing;
      insert into public.class_schedules(id, tenant_id, class_template_id, location_id,
        instructor_membership_id, day_of_week, starts_at, ends_at, timezone, allow_conflict, status)
      values ((slot->>'guardId')::uuid, target_tenant_id, template_id, (slot->>'locationId')::uuid,
        target_instructor_membership_id, (slot->>'dayOfWeek')::smallint, (slot->>'startsAt')::time,
        (slot->>'endsAt')::time, zone, true, 'archived')
      on conflict (id) do nothing;
    end loop;
    if target_intent = 'publish' then
      new_count := 0;
      existing_count := 0;
      for occurrence in select value from jsonb_array_elements(occurrences) loop
        instant_start := (occurrence->>'startsAt')::timestamptz;
        instant_end := (occurrence->>'endsAt')::timestamptz;
        if instant_end <= now() then continue; end if;
        if exists (select 1 from public.class_sessions s where s.tenant_id = target_tenant_id
          and s.instructor_membership_id = target_instructor_membership_id
          and (s.id = (occurrence->>'id')::uuid
            or (s.class_schedule_id = (occurrence->>'scheduleId')::uuid
              and (s.starts_at at time zone zone)::date = (instant_start at time zone zone)::date)
            or (s.class_template_id = template_id and s.location_id = (occurrence->>'locationId')::uuid
              and s.starts_at = instant_start and s.ends_at = instant_end and s.timezone = zone))) then
          existing_count := existing_count + 1;
          continue;
        end if;
        insert into public.class_sessions(id, tenant_id, class_schedule_id, class_template_id, location_id,
          instructor_membership_id, starts_at, ends_at, timezone, capacity, waitlist_enabled)
        values ((occurrence->>'id')::uuid, target_tenant_id, (occurrence->>'scheduleId')::uuid, template_id,
          (occurrence->>'locationId')::uuid, target_instructor_membership_id, instant_start, instant_end,
          zone, capacity, waitlist)
        on conflict do nothing;
        get diagnostics affected = row_count;
        new_count := new_count + affected;
        existing_count := existing_count + 1 - affected;
      end loop;
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('startsAt', o->'startsAt', 'endsAt', o->'endsAt', 'locationId', o->'locationId')
      order by (o->>'startsAt')::timestamptz, o->>'locationId'), '[]')
    into occurrences from jsonb_array_elements(occurrences) o where (o->>'endsAt')::timestamptz > now();
  return jsonb_build_object('newCount', new_count, 'existingCount', existing_count,
    'occurrences', occurrences, 'conflicts', conflicts, 'fingerprint', fingerprint);
end;
$$;

revoke all on function public.program_class_batch(uuid, uuid, jsonb, text, boolean, text) from public;
grant execute on function public.program_class_batch(uuid, uuid, jsonb, text, boolean, text) to authenticated;

-- Keep the original RPC and signature; only newly inserted sessions count.
create or replace function public.publish_recurring_class_sessions(
  target_tenant_id uuid,
  target_class_schedule_id uuid,
  target_from_date date,
  target_through_date date,
  target_waitlist_enabled boolean default true
) returns integer
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  source public.class_schedules;
  day date;
  local_start timestamp;
  local_end timestamp;
  published integer := 0;
  affected integer;
begin
  select * into source from public.class_schedules s
    where s.tenant_id = target_tenant_id and s.id = target_class_schedule_id and s.status = 'active';
  if not found then raise exception 'active class schedule not found' using errcode = 'P0002'; end if;
  if not public.can_manage_instructor_scope(target_tenant_id, source.instructor_membership_id) then
    raise exception 'not authorized to publish this schedule' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_tenant_id::text || ':' || source.instructor_membership_id::text, 38));
  if not exists (select 1 from public.tenant_memberships m where m.tenant_id = target_tenant_id
    and m.id = source.instructor_membership_id and m.status = 'active' and m.role in ('owner', 'admin', 'instructor')) then
    raise exception 'active instructor membership not found' using errcode = 'P0002';
  end if;
  if target_from_date is null or target_through_date is null or target_through_date < target_from_date
    or target_through_date > target_from_date + 56 then
    raise exception 'publication range must be between 0 and 8 weeks' using errcode = '22023';
  end if;
  if not exists (select 1 from public.class_templates t where t.tenant_id = target_tenant_id
    and t.id = source.class_template_id and t.status = 'active')
    or not exists (select 1 from public.locations l where l.tenant_id = target_tenant_id and l.id = source.location_id and l.status = 'active')
    or not exists (select 1 from pg_timezone_names where name = source.timezone) then
    raise exception 'schedule template, location or timezone is inactive or invalid' using errcode = '23514';
  end if;
  for day in select generated::date from generate_series(target_from_date::timestamp, target_through_date::timestamp, interval '1 day') generated loop
    if extract(dow from day)::integer <> source.day_of_week then continue; end if;
    local_start := day + source.starts_at;
    local_end := day + source.ends_at;
    if (local_start at time zone source.timezone) at time zone source.timezone <> local_start
      or (local_end at time zone source.timezone) at time zone source.timezone <> local_end then
      raise exception 'session time does not exist because of daylight saving time' using errcode = '22023';
    end if;
    if local_end at time zone source.timezone <= now() then continue; end if;
    if exists (select 1 from public.class_sessions s where s.tenant_id = target_tenant_id
      and s.class_schedule_id = source.id and ((s.starts_at at time zone source.timezone)::date = day
        or s.id = public.programming_batch_row_uuid(source.id::text || ':occurrence:' || day::text))) then
      continue;
    end if;
    insert into public.class_sessions(id, tenant_id, class_schedule_id, class_template_id, location_id,
      instructor_membership_id, starts_at, ends_at, timezone, capacity, waitlist_enabled)
    select public.programming_batch_row_uuid(source.id::text || ':occurrence:' || day::text),
      target_tenant_id, source.id, source.class_template_id, source.location_id, source.instructor_membership_id,
      local_start at time zone source.timezone, local_end at time zone source.timezone, source.timezone,
      t.capacity, target_waitlist_enabled
    from public.class_templates t where t.tenant_id = target_tenant_id and t.id = source.class_template_id
    on conflict (tenant_id, class_schedule_id, starts_at) do nothing;
    get diagnostics affected = row_count;
    published := published + affected;
  end loop;
  return published;
end;
$$;
