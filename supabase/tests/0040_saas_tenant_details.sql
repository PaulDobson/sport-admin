-- Disposable database only; apply migrations through 0040 first.
begin;
insert into auth.users (id, email) values
  ('84000000-0000-4000-8000-000000000001', 'platform-details@example.invalid'),
  ('84000000-0000-4000-8000-000000000002', 'owner-details@example.invalid');
insert into public.platform_admins (id) values ('84000000-0000-4000-8000-000000000001');
insert into public.tenants (id, name, status, billing_contact_name, billing_contact_email) values
  ('84000000-0000-4000-8000-000000000010', 'Academy with details', 'suspended', 'Billing Person', 'billing@example.invalid'),
  ('84000000-0000-4000-8000-000000000020', 'Academy without details', 'active', null, null);
insert into public.tenant_details (tenant_id, address, contact_name, contact_email, phone, city, region) values
  ('84000000-0000-4000-8000-000000000010', 'Street 123', 'Main Person', 'main@example.invalid', '+56 9 1234 5678', 'Santiago', 'Metropolitana');
insert into public.tenant_memberships (tenant_id, user_id, role, status) values
  ('84000000-0000-4000-8000-000000000020', '84000000-0000-4000-8000-000000000002', 'owner', 'active');
select set_config('request.jwt.claim.sub', '84000000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $$
declare r record;
begin
  select * into r from public.list_saas_tenants() where id = '84000000-0000-4000-8000-000000000010';
  if not found then raise exception 'Suspended tenant missing'; end if;
  if r.contact_name is distinct from 'Main Person' or r.contact_email is distinct from 'main@example.invalid'
    or r.address is distinct from 'Street 123' or r.phone is distinct from '+56 9 1234 5678'
    or r.city is distinct from 'Santiago' or r.region is distinct from 'Metropolitana'
    or r.billing_contact_name is distinct from 'Billing Person' or r.billing_contact_email is distinct from 'billing@example.invalid' then
    raise exception 'Gym details and billing mapping incorrect';
  end if;
  select * into r from public.list_saas_tenants() where id = '84000000-0000-4000-8000-000000000020';
  if not found then raise exception 'Left join must preserve tenants without details'; end if;
  if r.contact_name is not null or r.city is not null or r.address is not null then raise exception 'Missing details should be null'; end if;
end;
$$;
reset role;
do $$
begin
  if (select count(*) from public.saas_privileged_audit_log where actor_user_id = '84000000-0000-4000-8000-000000000001'
    and action = 'saas.tenants_read' and result = 'succeeded') <> 2 then
    raise exception 'Privileged access must remain audited';
  end if;
end;
$$;
select set_config('request.jwt.claim.sub', '84000000-0000-4000-8000-000000000002', true);
set local role authenticated;
do $$
begin
  begin
    perform public.list_saas_tenants();
    raise exception 'Tenant owner accessed platform contacts';
  exception when insufficient_privilege then null;
  end;
  if exists (select 1 from public.tenant_details where tenant_id = '84000000-0000-4000-8000-000000000010') then
    raise exception 'Cross-tenant table access leaked contacts';
  end if;
end;
$$;
reset role;
set local role anon;
do $$
begin
  begin
    perform public.list_saas_tenants();
    raise exception 'Anonymous platform access accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
