begin;

revoke insert, update, delete on public.saas_plans from public, anon, authenticated;

-- The old selector drives a limits-only workflow, not a commercial assignment.
create or replace function public.list_active_saas_plans_unlogged()
returns table (id uuid, name text, max_students integer, max_users integer, features jsonb)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  return query select p.id, p.name, p.max_students, p.max_users, p.features
    from public.saas_plans p where p.status = 'active' and not p.commercially_managed
    order by p.price, p.name;
end;
$$;

create function public.list_saas_plan_catalog()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.record_saas_privileged_operation(
    null, 'saas.plan_catalog_read', 'Consultar catalogo comercial', 'succeeded'
  );
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'status', p.status,
    'current_version', to_jsonb(v) - 'created_by',
    'created_at', p.created_at
  ) order by p.status, v.name, p.id), '[]'::jsonb)
  into result
  from public.saas_plans p
  left join public.saas_plan_versions v on v.id = p.current_version_id;
  return jsonb_build_object('plans', result);
end;
$$;

create function public.publish_saas_plan_version(
  target_plan uuid,
  expected_version uuid,
  operation_id uuid,
  terms jsonb,
  change_reason text
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  previous_operation public.saas_billing_operations;
  selected_plan public.saas_plans;
  created_version public.saas_plan_versions;
  request_payload jsonb;
  result jsonb;
  derived_cycle text;
  generated_plan uuid := coalesce(target_plan, gen_random_uuid());
  price_value numeric;
  duration_value numeric;
  students_value numeric;
  users_value numeric;
  trial_value numeric;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if operation_id is null or change_reason is null
    or length(btrim(change_reason)) not between 3 and 500 then
    raise exception 'An operation id and reason are required' using errcode = '22023';
  end if;
  request_payload := jsonb_build_object('plan', target_plan, 'expected_version', expected_version,
    'terms', terms, 'reason', btrim(change_reason));
  perform pg_advisory_xact_lock(hashtextextended('saas-billing:' || operation_id::text, 0));
  select * into previous_operation from public.saas_billing_operations o
    where o.operation_id = publish_saas_plan_version.operation_id;
  if found then
    if previous_operation.action <> 'publish_plan'
      or previous_operation.actor_user_id <> auth.uid()
      or previous_operation.payload <> request_payload then
      raise exception 'Operation id was already used with a different payload' using errcode = '23505';
    end if;
    return previous_operation.result;
  end if;

  if terms is null or jsonb_typeof(terms) <> 'object'
    or not (terms ?& array['name','price','duration_unit','duration_count',
      'trial_days','max_students','max_users','features','services'])
    or jsonb_typeof(terms->'name') <> 'string'
    or jsonb_typeof(terms->'price') <> 'number'
    or jsonb_typeof(terms->'duration_count') <> 'number'
    or jsonb_typeof(terms->'trial_days') <> 'number'
    or jsonb_typeof(terms->'max_students') <> 'number'
    or jsonb_typeof(terms->'max_users') <> 'number'
    or jsonb_typeof(terms->'features') <> 'array'
    or jsonb_typeof(terms->'services') <> 'array' then
    raise exception 'Invalid commercial plan payload' using errcode = '22023';
  end if;
  price_value := (terms->>'price')::numeric;
  duration_value := (terms->>'duration_count')::numeric;
  students_value := (terms->>'max_students')::numeric;
  users_value := (terms->>'max_users')::numeric;
  trial_value := (terms->>'trial_days')::numeric;
  if length(btrim(terms->>'name')) not between 1 and 160
    or (terms ? 'description' and terms->'description' <> 'null'::jsonb
      and (jsonb_typeof(terms->'description') <> 'string'
        or length(terms->>'description') > 2000))
    or price_value not between 0 and 9999999999 or price_value <> trunc(price_value)
    or coalesce(terms->>'duration_unit', '') not in ('days', 'months')
    or duration_value not between 1 and 2147483647 or duration_value <> trunc(duration_value)
    or students_value not between 1 and 2147483647 or students_value <> trunc(students_value)
    or users_value not between 1 and 2147483647 or users_value <> trunc(users_value)
    or trial_value not between 0 and 365 or trial_value <> trunc(trial_value)
    or not (terms->'features' <@ '["reports","offline","realtime","push"]'::jsonb)
    or jsonb_array_length(terms->'features') <> (
      select count(distinct f.value) from jsonb_array_elements(terms->'features') f
    )
    or jsonb_array_length(terms->'services') > 50
    or exists (select 1 from jsonb_array_elements(terms->'services') service
      where jsonb_typeof(service) <> 'string' or length(btrim(service #>> '{}')) not between 1 and 500)
  then
    raise exception 'Invalid plan name, whole CLP price, duration, limits, features or services' using errcode = '22023';
  end if;

  derived_cycle := case when terms->>'duration_unit' = 'months' then
    case duration_value when 1 then 'monthly' when 3 then 'quarterly'
      when 6 then 'semiannual' when 12 then 'annual' else 'custom' end
    else 'custom' end;
  if target_plan is null then
    if expected_version is not null then
      raise exception 'A new plan cannot have an expected version' using errcode = '22023';
    end if;
    insert into public.saas_plans (
      id, slug, name, description, price, currency, billing_cycle, trial_days,
      max_students, max_users, features, commercially_managed
    ) values (
      generated_plan, 'plan-' || generated_plan::text, btrim(terms->>'name'),
      nullif(btrim(terms->>'description'), ''), price_value, 'CLP', derived_cycle,
      trial_value::integer, students_value::integer, users_value::integer, terms->'features', true
    ) returning * into selected_plan;
  else
    select * into selected_plan from public.saas_plans p where p.id = target_plan for update;
    if not found then
      raise exception 'Plan not found' using errcode = 'P0002';
    end if;
    if selected_plan.status <> 'active' then
      raise exception 'Archived plans cannot publish new versions' using errcode = '22023';
    end if;
    if expected_version is distinct from selected_plan.current_version_id then
      raise exception 'Plan changed; reload before publishing a new version' using errcode = '40001';
    end if;
  end if;

  insert into public.saas_plan_versions (
    plan_id, version_number, name, description, price, currency, duration_unit,
    duration_count, trial_days, max_students, max_users, features, services, created_by
  )
  select generated_plan, coalesce(max(v.version_number), 0) + 1,
    btrim(terms->>'name'), nullif(btrim(terms->>'description'), ''), price_value, 'CLP',
    terms->>'duration_unit', duration_value::integer, trial_value::integer,
    students_value::integer, users_value::integer, terms->'features', terms->'services', auth.uid()
  from public.saas_plan_versions v where v.plan_id = generated_plan
  returning * into created_version;

  -- Old prices/limits remain compatibility fields, not the source of new contracts.
  update public.saas_plans set current_version_id = created_version.id,
    commercially_managed = true, name = created_version.name, description = created_version.description
  where id = generated_plan;
  result := jsonb_build_object('plan_id', generated_plan,
    'version_id', created_version.id, 'version_number', created_version.version_number);
  insert into public.saas_billing_operations(operation_id, action, actor_user_id, payload, result)
    values (operation_id, 'publish_plan', auth.uid(), request_payload, result);
  perform public.record_saas_privileged_operation(
    null, 'saas.plan_version_published', btrim(change_reason), 'succeeded',
    result || jsonb_build_object('operation_id', operation_id)
  );
  return result;
end;
$$;

create function public.archive_saas_plan(
  target_plan uuid, expected_version uuid, operation_id uuid, change_reason text
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  previous_operation public.saas_billing_operations;
  selected_plan public.saas_plans;
  request_payload jsonb;
  result jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if target_plan is null or expected_version is null or operation_id is null
    or change_reason is null or length(btrim(change_reason)) not between 3 and 500 then
    raise exception 'Plan, version, operation id and reason are required' using errcode = '22023';
  end if;
  request_payload := jsonb_build_object('plan', target_plan,
    'expected_version', expected_version, 'reason', btrim(change_reason));
  perform pg_advisory_xact_lock(hashtextextended('saas-billing:' || operation_id::text, 0));
  select * into previous_operation from public.saas_billing_operations o
    where o.operation_id = archive_saas_plan.operation_id;
  if found then
    if previous_operation.action <> 'archive_plan'
      or previous_operation.actor_user_id <> auth.uid()
      or previous_operation.payload <> request_payload then
      raise exception 'Operation id was already used with a different payload' using errcode = '23505';
    end if;
    return previous_operation.result;
  end if;
  select * into selected_plan from public.saas_plans p where p.id = target_plan for update;
  if not found then
    raise exception 'Plan not found' using errcode = 'P0002';
  end if;
  if selected_plan.current_version_id is distinct from expected_version then
    raise exception 'Plan changed; reload before archiving' using errcode = '40001';
  end if;
  update public.saas_plans set status = 'archived' where id = target_plan;
  result := jsonb_build_object('plan_id', target_plan, 'status', 'archived');
  insert into public.saas_billing_operations(operation_id, action, actor_user_id, payload, result)
    values (operation_id, 'archive_plan', auth.uid(), request_payload, result);
  perform public.record_saas_privileged_operation(
    null, 'saas.plan_archived', btrim(change_reason), 'succeeded', result
  );
  return result;
end;
$$;

revoke all on function public.list_saas_plan_catalog() from public, anon;
revoke all on function public.publish_saas_plan_version(uuid, uuid, uuid, jsonb, text) from public, anon;
revoke all on function public.archive_saas_plan(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.list_saas_plan_catalog() to authenticated;
grant execute on function public.publish_saas_plan_version(uuid, uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.archive_saas_plan(uuid, uuid, uuid, text) to authenticated;

commit;
