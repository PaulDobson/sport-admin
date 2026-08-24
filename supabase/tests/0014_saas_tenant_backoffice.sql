-- Run after migrations 0001-0015. Set two real auth user UUIDs below.
begin;

select set_config('test.tenant_owner', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.platform_admin', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status, created_by) values
  ('e0000000-0000-4000-8000-000000000001', 'Pending Academy', 'pending', current_setting('test.tenant_owner')::uuid),
  ('e0000000-0000-4000-8000-000000000002', 'Active Academy', 'active', current_setting('test.tenant_owner')::uuid);
insert into public.tenant_memberships (id, tenant_id, user_id, role, status) values
  ('e0000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000001', current_setting('test.tenant_owner')::uuid, 'owner', 'active');
insert into public.platform_admins (id)
values (current_setting('test.platform_admin')::uuid)
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.platform_admin'), true);

do $$
begin
  if (
    select count(*)
    from public.list_saas_tenants()
    where id in (
      'e0000000-0000-4000-8000-000000000001',
      'e0000000-0000-4000-8000-000000000002'
    )
  ) <> 2 then
    raise exception 'platform administrator cannot list tenants';
  end if;

  perform public.transition_saas_tenant_status(
    'e0000000-0000-4000-8000-000000000001', 'trial', 'Registration verified'
  );
  perform public.transition_saas_tenant_status(
    'e0000000-0000-4000-8000-000000000001', 'suspended', 'Payment overdue'
  );
  perform public.transition_saas_tenant_status(
    'e0000000-0000-4000-8000-000000000001', 'active', 'Payment recovered'
  );
  perform public.transition_saas_tenant_status(
    'e0000000-0000-4000-8000-000000000001', 'cancelled', 'Customer requested cancellation'
  );

  if (select status from public.tenants where id = 'e0000000-0000-4000-8000-000000000001') <> 'cancelled' then
    raise exception 'tenant final status is incorrect';
  end if;
  if (
    select count(*)
    from public.get_saas_tenant_status_history('e0000000-0000-4000-8000-000000000001')
  ) <> 4 then
    raise exception 'tenant status history is incomplete';
  end if;
  if not exists (
    select 1
    from public.get_saas_tenant_status_history('e0000000-0000-4000-8000-000000000001')
    where previous_status = 'trial'
      and new_status = 'suspended'
      and reason = 'Payment overdue'
  ) then
    raise exception 'tenant transition reason or previous status was not preserved';
  end if;

  begin
    perform public.transition_saas_tenant_status(
      'e0000000-0000-4000-8000-000000000001', 'active', 'Invalid reactivation'
    );
    raise exception 'cancelled tenant was reactivated';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.tenant_owner'), true);

do $$
begin
  begin
    perform public.list_saas_tenants();
    raise exception 'tenant owner listed SaaS tenants';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.transition_saas_tenant_status(
      'e0000000-0000-4000-8000-000000000002', 'suspended', 'Unauthorized change'
    );
    raise exception 'tenant owner changed SaaS tenant status';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_saas_tenant_status_history('e0000000-0000-4000-8000-000000000002');
    raise exception 'tenant owner read platform status history RPC';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;