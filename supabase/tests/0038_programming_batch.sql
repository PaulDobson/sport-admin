-- Local only. Run after migrations through 0038; all fixtures are rolled back.
begin;
insert into auth.users(id, email) values
  ('83800000-0000-4000-8000-000000000001', 'programming-owner@example.invalid'),
  ('83800000-0000-4000-8000-000000000002', 'programming-instructor@example.invalid'),
  ('83800000-0000-4000-8000-000000000003', 'programming-assistant@example.invalid');
insert into public.tenants(id, name, status) values ('83800000-0000-4000-8000-000000000010', 'Batch SQL test', 'active');
insert into public.tenant_memberships(id, tenant_id, user_id, role, status) values
  ('83800000-0000-4000-8000-000000000011', '83800000-0000-4000-8000-000000000010', '83800000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('83800000-0000-4000-8000-000000000012', '83800000-0000-4000-8000-000000000010', '83800000-0000-4000-8000-000000000002', 'instructor', 'active'),
  ('83800000-0000-4000-8000-000000000013', '83800000-0000-4000-8000-000000000010', '83800000-0000-4000-8000-000000000003', 'assistant', 'active');
insert into public.locations(id, tenant_id, name, type) values
  ('83800000-0000-4000-8000-000000000021', '83800000-0000-4000-8000-000000000010', 'North gym', 'external_gym'),
  ('83800000-0000-4000-8000-000000000022', '83800000-0000-4000-8000-000000000010', 'Park', 'park');
insert into public.disciplines(id, tenant_id, name) values
  ('83800000-0000-4000-8000-000000000031', '83800000-0000-4000-8000-000000000010', 'Batch discipline');
insert into public.class_templates(id, tenant_id, discipline_id, name, capacity) values
  ('83800000-0000-4000-8000-000000000041', '83800000-0000-4000-8000-000000000010', '83800000-0000-4000-8000-000000000031', 'Batch class', 12);
select set_config('request.jwt.claim.sub', '83800000-0000-4000-8000-000000000001', true);

do $$
declare
  tenant uuid := '83800000-0000-4000-8000-000000000010';
  instructor uuid := '83800000-0000-4000-8000-000000000011';
  p jsonb;
  q jsonb;
  review jsonb;
  result jsonb;
  day date := current_date + 7;
  schedule uuid;
  session uuid;
  before_count integer;
  rejected boolean;
begin
  p := jsonb_build_object(
    'operationId', '83800000-0000-4000-8000-000000000051',
    'classTemplateId', '83800000-0000-4000-8000-000000000041',
    'timezone', 'America/Santiago', 'mode', 'weekly', 'fromDate', day, 'throughDate', day + 7,
    'waitlistEnabled', true, 'allowConflict', false, 'slots', jsonb_build_array(
      jsonb_build_object('dayOfWeek', extract(dow from day), 'startsAt', '09:00', 'endsAt', '10:00', 'locationId', '83800000-0000-4000-8000-000000000021'),
      jsonb_build_object('dayOfWeek', extract(dow from day + 1), 'startsAt', '11:00', 'endsAt', '12:00', 'locationId', '83800000-0000-4000-8000-000000000022')));
  review := public.program_class_batch(tenant, instructor, p, 'publish', false);
  if (review->>'newCount')::integer <> 3 or jsonb_array_length(review->'occurrences') <> 3
    or jsonb_array_length(review->'conflicts') <> 0 then raise exception 'multi-day preview incorrect: %', review; end if;
  if exists (select 1 from public.class_schedules where tenant_id = tenant) then raise exception 'preview wrote rows'; end if;
  rejected := false;
  begin perform public.program_class_batch(tenant, instructor, p || '{"waitlistEnabled":false}', 'publish', true, review->>'fingerprint');
  exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'stale preview committed changed payload'; end if;
  rejected := false;
  begin perform public.program_class_batch(tenant, instructor, p, 'publish', true, null);
  exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'commit must require preview'; end if;
  result := public.program_class_batch(tenant, instructor, p, 'publish', true, review->>'fingerprint');
  if (result->>'newCount')::integer <> 3 then raise exception 'publication did not insert 3 sessions'; end if;
  result := public.program_class_batch(tenant, instructor, p, 'publish', true, review->>'fingerprint');
  if (result->>'newCount')::integer <> 0 or (result->>'existingCount')::integer <> 3 then raise exception 'retry not idempotent: %', result; end if;
  select id, class_schedule_id into session, schedule from public.class_sessions where tenant_id = tenant order by starts_at limit 1;
  update public.class_sessions set capacity = 9, waitlist_enabled = false, status = 'cancelled', ends_at = ends_at + interval '10 minutes' where id = session;
  if session::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'deterministic UUID must have valid RFC version/variant bits';
  end if;
  result := public.program_class_batch(tenant, instructor, p, 'publish', true, review->>'fingerprint');
  if (result->>'newCount')::integer <> 0 then raise exception 'edited/cancelled session was republished'; end if;
  if not exists (select 1 from public.class_sessions where id = session and capacity = 9 and not waitlist_enabled and status = 'cancelled') then raise exception 'session edits overwritten'; end if;
  if public.publish_recurring_class_sessions(tenant, schedule, day, day + 7, true) <> 0 then raise exception 'legacy RPC must count NEW rows only'; end if;
  if not exists (select 1 from public.class_sessions where id = session and status = 'cancelled' and not waitlist_enabled) then raise exception 'legacy republish overwrote edits'; end if;

  -- A changed payload cannot reuse an operation, including non-persisted save settings.
  for q in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_set(p, '{waitlistEnabled}', 'false'), jsonb_set(p, '{throughDate}', to_jsonb((day + 14)::text)),
    jsonb_set(p, '{slots,0,locationId}', '"83800000-0000-4000-8000-000000000022"'))) loop
    rejected := false;
    begin perform public.program_class_batch(tenant, instructor, q, 'publish', false);
    exception when invalid_parameter_value then rejected := true; end;
    if not rejected then raise exception 'payload reuse accepted: %', q; end if;
  end loop;

  -- Different operation reuses the exact instructor rule and preserves the cancelled occurrence.
  q := jsonb_set(p, '{operationId}', '"83800000-0000-4000-8000-000000000052"');
  review := public.program_class_batch(tenant, instructor, q, 'publish', false);
  if (review->>'newCount')::integer <> 0 then raise exception 'republish preview did not recognize edited occurrence: %', review; end if;
  result := public.program_class_batch(tenant, instructor, q, 'publish', true, review->>'fingerprint');
  if (result->>'newCount')::integer <> 0 then raise exception 'republish duplicated existing sessions'; end if;
  -- Stable occurrence UUIDs also preserve a session moved to a different date.
  update public.class_sessions set starts_at = starts_at + interval '2 days', ends_at = ends_at + interval '2 days' where id = session;
  review := public.program_class_batch(tenant, instructor, q, 'publish', false);
  if (review->>'newCount')::integer <> 0 then raise exception 'moved session was recreated'; end if;
  if public.publish_recurring_class_sessions(tenant, schedule, day, day + 7, true) <> 0 then raise exception 'legacy RPC recreated moved session'; end if;

  -- Conflict across timezones against an actual overlapping UTC session.
  q := jsonb_set(p, '{operationId}', '"83800000-0000-4000-8000-000000000053"');
  q := jsonb_set(q, '{timezone}', '"UTC"');
  q := jsonb_set(q, '{slots}', jsonb_build_array(jsonb_build_object(
    'dayOfWeek', extract(dow from day + 1), 'startsAt',
    to_char((day + 1 + time '11:30') at time zone 'America/Santiago' at time zone 'UTC', 'HH24:MI'),
    'endsAt', to_char((day + 1 + time '12:30') at time zone 'America/Santiago' at time zone 'UTC', 'HH24:MI'),
    'locationId', '83800000-0000-4000-8000-000000000021')));
  review := public.program_class_batch(tenant, instructor, q, 'publish', false);
  if jsonb_array_length(review->'conflicts') = 0 or not (review->'conflicts'->0->>'message') like '%Park%' then raise exception 'missing contextual cross-zone conflict: %', review; end if;
  select count(*) into before_count from public.class_schedules where tenant_id = tenant;
  rejected := false;
  begin perform public.program_class_batch(tenant, instructor, q, 'publish', true, review->>'fingerprint');
  exception when check_violation then rejected := true; end;
  if not rejected or (select count(*) from public.class_schedules where tenant_id = tenant) <> before_count then raise exception 'unconfirmed conflict wrote partial rules'; end if;
  result := public.program_class_batch(tenant, instructor, jsonb_set(q, '{allowConflict}', 'true'), 'publish', true, review->>'fingerprint');
  if (result->>'newCount')::integer <> 1 then raise exception 'explicit override failed'; end if;

  -- One-off overnight dates, and internal requested-slot conflicts.
  q := jsonb_set(p, '{operationId}', '"83800000-0000-4000-8000-000000000054"');
  q := jsonb_set(q, '{mode}', '"once"');
  q := jsonb_set(q, '{slots}', jsonb_build_array(jsonb_build_object('dayOfWeek', extract(dow from day),
    'date', day, 'endDate', day + 1, 'startsAt', '23:00', 'endsAt', '01:00', 'locationId', '83800000-0000-4000-8000-000000000022')));
  review := public.program_class_batch(tenant, instructor, q, 'publish', false);
  if (review->>'newCount')::integer <> 1 then raise exception 'overnight preview failed'; end if;
  result := public.program_class_batch(tenant, instructor, q, 'publish', true, review->>'fingerprint');
  if (result->>'newCount')::integer <> 1 then raise exception 'overnight commit failed'; end if;
  -- Publication is based on ends > now, not starts > now.
  q := p || jsonb_build_object(
    'operationId', '83800000-0000-4000-8000-000000000061', 'mode', 'once', 'timezone', 'UTC',
    'fromDate', ((now() at time zone 'UTC') - interval '10 minutes')::date,
    'throughDate', ((now() at time zone 'UTC') + interval '10 minutes')::date,
    'slots', jsonb_build_array(jsonb_build_object('dayOfWeek', 0,
      'date', ((now() at time zone 'UTC') - interval '10 minutes')::date,
      'endDate', ((now() at time zone 'UTC') + interval '10 minutes')::date,
      'startsAt', to_char((now() at time zone 'UTC') - interval '10 minutes', 'HH24:MI'),
      'endsAt', to_char((now() at time zone 'UTC') + interval '10 minutes', 'HH24:MI'),
      'locationId', '83800000-0000-4000-8000-000000000021')));
  review := public.program_class_batch(tenant, instructor, q, 'publish', false);
  if (review->>'newCount')::integer <> 1 then raise exception 'in-progress occurrence was excluded'; end if;
  q := jsonb_set(q, '{operationId}', '"83800000-0000-4000-8000-000000000062"');
  q := jsonb_set(q, '{slots,0,endDate}', to_jsonb(((now() at time zone 'UTC') - interval '1 minute')::date::text));
  q := jsonb_set(q, '{slots,0,endsAt}', to_jsonb(to_char((now() at time zone 'UTC') - interval '1 minute', 'HH24:MI')));
  review := public.program_class_batch(tenant, instructor, q, 'publish', false);
  if (review->>'newCount')::integer <> 0 or jsonb_array_length(review->'occurrences') <> 0
    or jsonb_array_length(review->'conflicts') <> 0 then raise exception 'ended occurrence was included'; end if;
  rejected := false;
  begin perform public.program_class_batch(tenant, instructor, q, 'save', false);
  exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'one-off save accepted'; end if;
  q := jsonb_set(p, '{operationId}', '"83800000-0000-4000-8000-000000000055"');
  q := jsonb_set(q, '{slots,1}', jsonb_set(q->'slots'->0, '{startsAt}', '"09:30"'));
  review := public.program_class_batch(tenant, instructor, q, 'publish', false);
  if not exists (select 1 from jsonb_array_elements(review->'conflicts') c where c->>'message' like 'Los bloques solicitados%') then raise exception 'missing requested-slot overlap'; end if;
  q := q || '{"allowConflict":true}';
  result := public.program_class_batch(tenant, instructor, q, 'publish', true, review->>'fingerprint');
  result := public.program_class_batch(tenant, instructor, q, 'publish', true, review->>'fingerprint');
  if (result->>'newCount')::integer <> 0 then raise exception 'overlapping batch retry duplicated sessions'; end if;

  -- Invalid dates, horizon, timezone, and nonexistent DST local times.
  for q in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_set(p, '{operationId}', '"83800000-0000-4000-8000-000000000056"') || '{"throughDate":"2099-01-01"}',
    p || '{"operationId":"83800000-0000-4000-8000-000000000057","fromDate":"2030-02-30"}',
    p || '{"operationId":"83800000-0000-4000-8000-000000000058","timezone":"Bogus/Timezone"}',
    p || jsonb_build_object('operationId', '83800000-0000-4000-8000-000000000059', 'timezone', 'America/New_York',
      'fromDate', '2030-03-10', 'throughDate', '2030-03-10',
      'slots', jsonb_build_array(jsonb_build_object('dayOfWeek', 0, 'startsAt', '02:15', 'endsAt', '03:15', 'locationId', '83800000-0000-4000-8000-000000000021')))
  )) loop
    rejected := false;
    begin perform public.program_class_batch(tenant, instructor, q, 'publish', false);
    exception when invalid_parameter_value or datetime_field_overflow then rejected := true; end;
    if not rejected then raise exception 'invalid calendar/time input accepted: %', q; end if;
  end loop;

  -- Owner may publish another instructor, but never reassign their existing rule.
  q := p || '{"operationId":"83800000-0000-4000-8000-000000000060"}';
  review := public.program_class_batch(tenant, '83800000-0000-4000-8000-000000000012', q, 'save', false);
  perform public.program_class_batch(tenant, '83800000-0000-4000-8000-000000000012', q, 'save', true, review->>'fingerprint');
  if exists (select 1 from public.class_sessions where tenant_id = tenant and instructor_membership_id = '83800000-0000-4000-8000-000000000012') then raise exception 'save published sessions'; end if;
  rejected := false;
  begin perform public.program_class_batch(tenant, '83800000-0000-4000-8000-000000000012',
    q || '{"waitlistEnabled":false}', 'save', false);
  exception when invalid_parameter_value then rejected := true; end;
  if not rejected then raise exception 'saved operation accepted changed non-persisted payload'; end if;
  -- The saved instructor has rules but no sessions: conflicts must still work across zones.
  q := q || jsonb_build_object('operationId', '83800000-0000-4000-8000-000000000063', 'timezone', 'UTC',
    'slots', jsonb_build_array(jsonb_build_object('dayOfWeek', extract(dow from day),
      'startsAt', to_char((day + time '09:30') at time zone 'America/Santiago' at time zone 'UTC', 'HH24:MI'),
      'endsAt', to_char((day + time '10:30') at time zone 'America/Santiago' at time zone 'UTC', 'HH24:MI'),
      'locationId', '83800000-0000-4000-8000-000000000022')));
  review := public.program_class_batch(tenant, '83800000-0000-4000-8000-000000000012', q, 'publish', false);
  if not exists (select 1 from jsonb_array_elements(review->'conflicts') c where c->>'message' like '%horario%North gym%') then
    raise exception 'missing cross-zone rule conflict: %', review;
  end if;
  perform set_config('request.jwt.claim.sub', '83800000-0000-4000-8000-000000000002', true);
  rejected := false;
  begin perform public.program_class_batch(tenant, instructor, q, 'save', false);
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'instructor accessed another instructor'; end if;
  perform set_config('request.jwt.claim.sub', '83800000-0000-4000-8000-000000000003', true);
  rejected := false;
  begin perform public.program_class_batch(tenant, '83800000-0000-4000-8000-000000000013', q, 'save', false);
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'assistant accessed batch publishing'; end if;
  perform set_config('request.jwt.claim.sub', '83800000-0000-4000-8000-000000000001', true);
  update public.tenant_memberships set status = 'revoked' where id = instructor;
  rejected := false;
  begin perform public.program_class_batch(tenant, instructor, p, 'publish', false);
  exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'inactive membership accessed batch publishing'; end if;
  update public.tenant_memberships set status = 'active' where id = instructor;
  update public.locations set status = 'archived' where id = '83800000-0000-4000-8000-000000000021';
  rejected := false;
  begin perform public.program_class_batch(tenant, instructor, p, 'publish', false);
  exception when no_data_found then rejected := true; end;
  if not rejected then raise exception 'inactive location accepted'; end if;
end;
$$;
rollback;
