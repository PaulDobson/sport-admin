-- Disposable database only; apply migrations through 0039 first.
begin;
insert into auth.users (id, email) values
  ('83900000-0000-4000-8000-000000000001', 'gym-owner@example.invalid'),
  ('83900000-0000-4000-8000-000000000002', 'gym-admin@example.invalid'),
  ('83900000-0000-4000-8000-000000000003', 'gym-instructor@example.invalid'),
  ('83900000-0000-4000-8000-000000000004', 'gym-assistant@example.invalid'),
  ('83900000-0000-4000-8000-000000000005', 'gym-revoked@example.invalid');
insert into public.tenants (id, name, status) values
  ('83900000-0000-4000-8000-000000000010', 'Original academy', 'active'),
  ('83900000-0000-4000-8000-000000000020', 'Other academy', 'active');
insert into public.tenant_memberships (tenant_id, user_id, role, status) values
  ('83900000-0000-4000-8000-000000000010', '83900000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('83900000-0000-4000-8000-000000000010', '83900000-0000-4000-8000-000000000002', 'admin', 'active'),
  ('83900000-0000-4000-8000-000000000010', '83900000-0000-4000-8000-000000000003', 'instructor', 'active'),
  ('83900000-0000-4000-8000-000000000010', '83900000-0000-4000-8000-000000000004', 'assistant', 'active'),
  ('83900000-0000-4000-8000-000000000010', '83900000-0000-4000-8000-000000000005', 'owner', 'revoked');
select set_config('request.jwt.claim.sub', '83900000-0000-4000-8000-000000000001', true);
set local role authenticated;

do $$
declare
  tenant uuid := '83900000-0000-4000-8000-000000000010';
  row record;
begin
  select * into row from public.get_tenant_details(tenant);
  if row.name <> 'Original academy' or row.address is not null then
    raise exception 'Existing academies must load without a details row';
  end if;
  perform public.update_tenant_details(tenant, ' Updated academy ', ' Street 1 ', ' Ana ', ' ana@example.cl ', ' +56 9 1234 5678 ', ' Santiago ', ' Metropolitana ');
  select * into row from public.get_tenant_details(tenant);
  if row.name <> 'Updated academy' or row.address <> 'Street 1' or row.contact_name <> 'Ana'
    or row.contact_email <> 'ana@example.cl' or row.phone <> '+56 9 1234 5678'
    or row.city <> 'Santiago' or row.region <> 'Metropolitana' then
    raise exception 'Normalized values were not persisted';
  end if;
  if not exists (select 1 from public.audit_log where tenant_id = tenant and action = 'tenant.details_updated' and metadata = '{}'::jsonb) then
    raise exception 'Missing privacy-preserving audit entry';
  end if;
  begin
    perform public.update_tenant_details(tenant, 'Invalid update', '', '', 'invalid-email', '', '', '');
    raise exception 'Invalid email accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.update_tenant_details(tenant, ' ', '', '', '', '', '', '');
    raise exception 'Blank name accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.update_tenant_details(tenant, 'Invalid phone', '', '', '', '123', '', '');
    raise exception 'Invalid phone accepted';
  exception when invalid_parameter_value then null;
  end;
  select * into row from public.get_tenant_details(tenant);
  if row.name <> 'Updated academy' then raise exception 'Invalid update was not atomic'; end if;
  begin
    perform public.update_tenant_details('83900000-0000-4000-8000-000000000020', 'Forged', '', '', '', '', '', '');
    raise exception 'Cross-tenant update accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_tenant_details('83900000-0000-4000-8000-000000000020');
    raise exception 'Cross-tenant read accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '83900000-0000-4000-8000-000000000002', true);
select public.update_tenant_details('83900000-0000-4000-8000-000000000010', 'Admin academy', '', '', '', '', '', '');
do $$
begin
  if not exists (select 1 from public.get_tenant_details('83900000-0000-4000-8000-000000000010') where name = 'Admin academy' and contact_email is null and city is null and phone is null) then
    raise exception 'Admin must be able to clear optional fields';
  end if;
end;
$$;

do $$
declare actor text;
begin
  foreach actor in array array[
    '83900000-0000-4000-8000-000000000003',
    '83900000-0000-4000-8000-000000000004',
    '83900000-0000-4000-8000-000000000005'
  ] loop
    perform set_config('request.jwt.claim.sub', actor, true);
    if exists (select 1 from public.tenant_details) then raise exception 'RLS exposed contact data'; end if;
    begin
      perform public.get_tenant_details('83900000-0000-4000-8000-000000000010');
      raise exception 'Unauthorized read accepted';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.update_tenant_details('83900000-0000-4000-8000-000000000010', 'Forbidden', '', '', '', '', '', '');
      raise exception 'Unauthorized update accepted';
    exception when insufficient_privilege then null;
    end;
    begin
      update public.tenant_details set city = 'Forbidden';
      raise exception 'Direct mutation accepted';
    exception when insufficient_privilege then null;
    end;
  end loop;
end;
$$;

reset role;
update public.tenants set status = 'suspended' where id = '83900000-0000-4000-8000-000000000010';
select set_config('request.jwt.claim.sub', '83900000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $$
begin
  begin
    perform public.get_tenant_details('83900000-0000-4000-8000-000000000010');
    raise exception 'Suspended academy read accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.update_tenant_details('83900000-0000-4000-8000-000000000010', 'Forbidden', '', '', '', '', '', '');
    raise exception 'Suspended academy update accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
set local role anon;
do $$
begin
  begin
    perform public.get_tenant_details('83900000-0000-4000-8000-000000000010');
    raise exception 'Anonymous read accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
