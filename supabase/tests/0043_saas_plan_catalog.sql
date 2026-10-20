-- Disposable database only; requires all migrations through 0043.
-- Self-contained fixtures, all changes rolled back. Not a concurrency/backfill substitute.
begin;

do $$
begin
  if (select count(*) from pg_constraint
    where conrelid = 'public.saas_charges'::regclass and contype = 'c'
      and conname in ('saas_charges_manual_reference_length_check', 'saas_charges_manual_reference_check')) <> 2 then
    raise exception 'Manual reference length and payment checks must have distinct names';
  end if;
end;
$$;

insert into auth.users (id, email) values
  ('ad430000-0000-4000-8000-000000000001', 'catalog-admin@example.invalid'),
  ('ad430000-0000-4000-8000-000000000002', 'catalog-owner@example.invalid');
insert into public.platform_admins(id) values ('ad430000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'ad430000-0000-4000-8000-000000000002', true);
do $$
begin
  begin
    perform public.list_saas_plan_catalog();
    raise exception 'Non-admin read the commercial catalog';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.publish_saas_plan_version(null, null, gen_random_uuid(), '{}'::jsonb, 'Not allowed');
    raise exception 'Non-admin published a plan';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.saas_payment_receipts;
    raise exception 'Direct receipt access was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.saas_issuer_versions;
    raise exception 'Direct issuer access was allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'ad430000-0000-4000-8000-000000000001', true);
do $$
declare
  terms jsonb := '{
    "name":"Academia Pro","description":"Capacitacion incluida","price":11900,
    "duration_unit":"months","duration_count":3,"trial_days":7,
    "max_students":100,"max_users":5,"features":["reports","push"],
    "services":["Soporte","Capacitacion"]
  }'::jsonb;
  first_result jsonb;
  edited_result jsonb;
  catalog jsonb;
  target_id uuid;
begin
  first_result := public.publish_saas_plan_version(null, null,
    'ad430000-0000-4000-8000-000000000011', terms, 'Nueva oferta');
  if public.publish_saas_plan_version(null, null,
    'ad430000-0000-4000-8000-000000000011', terms, 'Nueva oferta') <> first_result then
    raise exception 'Identical operation did not replay its original result';
  end if;
  target_id := (first_result->>'plan_id')::uuid;
  perform set_config('test.catalog_plan', target_id::text, true);
  perform set_config('test.catalog_first_version', first_result->>'version_id', true);
  begin
    perform public.publish_saas_plan_version(null, null,
      'ad430000-0000-4000-8000-000000000011', terms || '{"price":12000}', 'Nueva oferta');
    raise exception 'Different payload reused an operation id';
  exception when unique_violation then null;
  end;
  begin
    perform public.publish_saas_plan_version(null, null, gen_random_uuid(),
      terms || '{"price":11900.5}', 'Precio invalido');
    raise exception 'Fractional CLP price was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.publish_saas_plan_version(null, null, gen_random_uuid(),
      terms || '{"features":["unsupported"]}', 'Funcion invalida');
    raise exception 'Unknown feature was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.publish_saas_plan_version(null, null, gen_random_uuid(),
      terms || '{"duration_count":0}', 'Duracion invalida');
    raise exception 'Zero duration was accepted';
  exception when invalid_parameter_value then null;
  end;
  edited_result := public.publish_saas_plan_version(target_id,
    (first_result->>'version_id')::uuid, gen_random_uuid(),
    terms || '{"price":23900,"duration_unit":"days","duration_count":45}', 'Nueva version');
  if (edited_result->>'version_number')::integer <> 2 then
    raise exception 'Plan edit did not publish a new version';
  end if;
  perform set_config('test.catalog_latest_version', edited_result->>'version_id', true);
  begin
    perform public.publish_saas_plan_version(target_id,
      (first_result->>'version_id')::uuid, gen_random_uuid(), terms, 'Version obsoleta');
    raise exception 'Stale plan version was accepted';
  exception when serialization_failure then null;
  end;
  catalog := public.list_saas_plan_catalog();
  if not exists (
    select 1 from jsonb_array_elements(catalog->'plans') p
    where p->>'id' = target_id::text and (p->'current_version'->>'price')::numeric = 23900
      and p->'current_version'->>'duration_unit' = 'days'
  ) then
    raise exception 'Catalog did not expose the newly published terms';
  end if;
  perform public.archive_saas_plan(target_id, (edited_result->>'version_id')::uuid,
    'ad430000-0000-4000-8000-000000000012', 'Oferta retirada');
  begin
    perform public.publish_saas_plan_version(target_id,
      (edited_result->>'version_id')::uuid, gen_random_uuid(), terms, 'No permitido');
    raise exception 'Archived plan accepted a new version';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.archive_saas_plan(target_id, (edited_result->>'version_id')::uuid,
      'ad430000-0000-4000-8000-000000000011', 'Operacion incompatible');
    raise exception 'Different action reused a publication operation id';
  exception when unique_violation then null;
  end;
end;
$$;

reset role;
do $$
begin
  if (select count(*) from public.saas_plan_versions
    where plan_id = current_setting('test.catalog_plan')::uuid) <> 2 then
    raise exception 'Publication retry duplicated a version';
  end if;
  if (select price from public.saas_plan_versions
    where id = current_setting('test.catalog_first_version')::uuid) <> 11900 then
    raise exception 'Editing modified historical version price';
  end if;
  begin
    update public.saas_plan_versions set price = 1
      where id = current_setting('test.catalog_first_version')::uuid;
    raise exception 'Immutable version was modified';
  exception when object_not_in_prerequisite_state then null;
  end;
  if not exists (select 1 from public.saas_privileged_audit_log
    where action = 'saas.plan_archived'
      and metadata->>'plan_id' = current_setting('test.catalog_plan')) then
    raise exception 'Archive audit is missing';
  end if;
  if (select public from storage.buckets where id = 'saas-receipts') is distinct from false then
    raise exception 'Receipt bucket is not private';
  end if;
end;
$$;
rollback;
