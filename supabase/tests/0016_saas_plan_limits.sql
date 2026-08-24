-- Run after migrations 0001-0017. Set two real auth user UUIDs below.
begin;

select set_config('test.owner', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.platform_admin', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status) values
  ('a1000000-0000-4000-8000-000000000001', 'Limited Academy', 'active'),
  ('a1000000-0000-4000-8000-000000000002', 'Other Academy', 'active');
insert into public.tenant_memberships (id, tenant_id, user_id, role, status) values
  ('a1000000-0000-4000-8000-000000000011', 'a1000000-0000-4000-8000-000000000001', current_setting('test.owner')::uuid, 'owner', 'active');
insert into public.platform_admins (id)
values (current_setting('test.platform_admin')::uuid)
on conflict (id) do nothing;

insert into public.saas_plans (
  id, slug, name, price, currency, billing_cycle, max_students, max_users, features
) values
  ('a1000000-0000-4000-8000-000000000021', 'limited', 'Limited', 19, 'USD', 'monthly', 1, 1, '["reports"]'),
  ('a1000000-0000-4000-8000-000000000022', 'connected', 'Connected', 39, 'USD', 'monthly', 3, 2, '["offline", "realtime"]');
insert into public.saas_subscriptions (
  id, tenant_id, plan_id, status, payment_status, starts_on,
  current_period_starts_on, current_period_ends_on, price, currency, billing_cycle
) values (
  'a1000000-0000-4000-8000-000000000031', 'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000021', 'active', 'paid', current_date - 1,
  current_date - 1, current_date + 29, 19, 'USD', 'monthly'
);
insert into public.saas_limits (
  tenant_id, subscription_id, plan_id, max_students, max_users, features, effective_from
) values (
  'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000031',
  'a1000000-0000-4000-8000-000000000021', 1, 1, '["reports"]', current_date - 1
);

insert into public.students (id, tenant_id, full_name) values
  ('a1000000-0000-4000-8000-000000000041', 'a1000000-0000-4000-8000-000000000001', 'First Student');

do $$
begin
  begin
    insert into public.students (tenant_id, full_name)
    values ('a1000000-0000-4000-8000-000000000001', 'Blocked Student');
    raise exception 'student above plan limit was accepted';
  exception when raise_exception then
    if sqlerrm not like 'SaaS student limit reached (1/1)%' then raise; end if;
  end;

  update public.students
  set status = 'archived', archived_at = now()
  where id = 'a1000000-0000-4000-8000-000000000041';
  insert into public.students (tenant_id, full_name)
  values ('a1000000-0000-4000-8000-000000000001', 'Replacement Student');

  insert into public.tenant_memberships (tenant_id, user_id, role, status)
  values (
    'a1000000-0000-4000-8000-000000000001',
    current_setting('test.platform_admin')::uuid, 'admin', 'invited'
  );
  begin
    update public.tenant_memberships
    set status = 'active'
    where tenant_id = 'a1000000-0000-4000-8000-000000000001'
      and user_id = current_setting('test.platform_admin')::uuid;
    raise exception 'active user above plan limit was accepted';
  exception when raise_exception then
    if sqlerrm not like 'SaaS user limit reached (1/1)%' then raise; end if;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner'), true);

do $$
begin
  if not public.can_use_saas_feature(
    'a1000000-0000-4000-8000-000000000001', 'reports'
  ) or public.can_use_saas_feature(
    'a1000000-0000-4000-8000-000000000001', 'offline'
  ) then
    raise exception 'initial feature entitlements are incorrect';
  end if;
  if public.can_use_saas_feature(
    'a1000000-0000-4000-8000-000000000002', 'reports'
  ) then
    raise exception 'cross-tenant feature access was accepted';
  end if;
  begin
    perform public.list_active_saas_plans();
    raise exception 'tenant owner listed platform SaaS plans';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_saas_tenant_entitlements(
      'a1000000-0000-4000-8000-000000000001'
    );
    raise exception 'tenant owner read platform entitlement usage';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.platform_admin'), true);
select public.schedule_saas_plan_limits(
  'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000031',
  'a1000000-0000-4000-8000-000000000022',
  current_date,
  'Upgrade to connected plan'
);

do $$
begin
  if (select count(*) from public.list_active_saas_plans()) <> 2 then
    raise exception 'platform administrator cannot list active SaaS plans';
  end if;
  if not exists (
    select 1 from public.get_saas_tenant_entitlements(
      'a1000000-0000-4000-8000-000000000001'
    )
    where plan_id = 'a1000000-0000-4000-8000-000000000022'
      and active_students = 1 and active_users = 1
      and max_students = 3 and max_users = 2
  ) then
    raise exception 'platform entitlement usage is incorrect';
  end if;
  if not exists (
    select 1 from public.saas_limits
    where tenant_id = 'a1000000-0000-4000-8000-000000000001'
      and plan_id = 'a1000000-0000-4000-8000-000000000021'
      and effective_until = current_date - 1
  ) then
    raise exception 'previous plan snapshot was not closed';
  end if;
  if not exists (
    select 1 from public.audit_log
    where tenant_id = 'a1000000-0000-4000-8000-000000000001'
      and action = 'saas.plan_limits_scheduled'
      and metadata ->> 'plan_id' = 'a1000000-0000-4000-8000-000000000022'
      and metadata ->> 'reason' = 'Upgrade to connected plan'
  ) then
    raise exception 'plan limit change was not audited';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.owner'), true);

do $$
begin
  if public.can_use_saas_feature(
    'a1000000-0000-4000-8000-000000000001', 'reports'
  ) or not public.can_use_saas_feature(
    'a1000000-0000-4000-8000-000000000001', 'offline'
  ) or not public.can_use_saas_feature(
    'a1000000-0000-4000-8000-000000000001', 'realtime'
  ) then
    raise exception 'changed plan feature entitlements are incorrect';
  end if;
  if (select max_students from public.current_saas_limits(
    'a1000000-0000-4000-8000-000000000001', current_date - 1
  )) <> 1 or (select max_students from public.current_saas_limits(
    'a1000000-0000-4000-8000-000000000001', current_date
  )) <> 3 then
    raise exception 'plan change did not preserve effective limit history';
  end if;
  if (select plan_id from public.current_saas_limits(
    'a1000000-0000-4000-8000-000000000001', current_date
  )) <> 'a1000000-0000-4000-8000-000000000022' then
    raise exception 'plan change snapshot lost its source plan';
  end if;
end;
$$;

reset role;

insert into public.students (tenant_id, full_name)
values ('a1000000-0000-4000-8000-000000000001', 'Second Student');
update public.tenant_memberships
set status = 'active'
where tenant_id = 'a1000000-0000-4000-8000-000000000001'
  and user_id = current_setting('test.platform_admin')::uuid;

update public.saas_subscriptions
set status = 'suspended'
where id = 'a1000000-0000-4000-8000-000000000031';
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner'), true);

do $$
begin
  if public.can_use_saas_feature(
    'a1000000-0000-4000-8000-000000000001', 'offline'
  ) then
    raise exception 'suspended subscription retained feature access';
  end if;
end;
$$;

reset role;
rollback;