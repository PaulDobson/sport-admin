-- Run after migrations 0001-0012. Set one real auth user UUID below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);

insert into public.tenants (id, name, status) values
  ('b0000000-0000-4000-8000-000000000001', 'Membership Lifecycle Tenant', 'active');
insert into public.tenant_memberships (id, tenant_id, user_id, role, status) values
  ('b0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', current_setting('test.user_a')::uuid, 'owner', 'active');
insert into public.students (id, tenant_id, full_name) values
  ('b0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000001', 'Lifecycle Student');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

insert into public.membership_plans (
  id, tenant_id, name, price, duration_days, currency,
  billing_cycle, expiration_grace_days
) values (
  'b0000000-0000-4000-8000-000000000031',
  'b0000000-0000-4000-8000-000000000001',
  'Monthly Plan', 100, 30, 'USD', 'monthly', 10
);

select set_config(
  'test.membership_id',
  public.activate_student_membership(
    'b0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000021',
    'b0000000-0000-4000-8000-000000000031',
    '2026-08-01',
    'b0000000-0000-4000-8000-000000000011',
    'b0000000-0000-4000-8000-000000000041'
  )::text,
  true
);

do $$
begin
  if not exists (
    select 1 from public.student_memberships
    where id = current_setting('test.membership_id')::uuid
      and status = 'active'
      and agreed_price = 100
      and currency = 'USD'
      and expires_at = '2026-08-31'
      and next_billing_date = '2026-09-01'
  ) then
    raise exception 'membership activation did not snapshot the plan';
  end if;
end;
$$;

select public.transition_student_membership(
  'b0000000-0000-4000-8000-000000000001',
  current_setting('test.membership_id')::uuid,
  'pause', '2026-08-15',
  'b0000000-0000-4000-8000-000000000011',
  'b0000000-0000-4000-8000-000000000042'
);
select public.transition_student_membership(
  'b0000000-0000-4000-8000-000000000001',
  current_setting('test.membership_id')::uuid,
  'renew', '2026-09-01',
  'b0000000-0000-4000-8000-000000000011',
  'b0000000-0000-4000-8000-000000000043'
);

do $$
begin
  if not exists (
    select 1 from public.student_memberships
    where id = current_setting('test.membership_id')::uuid
      and status = 'active'
      and expires_at = '2026-09-30'
      and next_billing_date = '2026-10-01'
  ) then
    raise exception 'membership renewal did not extend the cycle';
  end if;
end;
$$;

select public.transition_student_membership(
  'b0000000-0000-4000-8000-000000000001',
  current_setting('test.membership_id')::uuid,
  'expire', '2026-10-02',
  'b0000000-0000-4000-8000-000000000011',
  'b0000000-0000-4000-8000-000000000044'
);

do $$
begin
  if not exists (
    select 1 from public.student_memberships
    where id = current_setting('test.membership_id')::uuid
      and status = 'past_due'
  ) then
    raise exception 'membership must remain current as past due during grace';
  end if;
end;
$$;

select public.transition_student_membership(
  'b0000000-0000-4000-8000-000000000001',
  current_setting('test.membership_id')::uuid,
  'expire', '2026-10-11',
  'b0000000-0000-4000-8000-000000000011',
  'b0000000-0000-4000-8000-000000000045'
);
select public.transition_student_membership(
  'b0000000-0000-4000-8000-000000000001',
  current_setting('test.membership_id')::uuid,
  'cancel', '2026-10-12',
  'b0000000-0000-4000-8000-000000000011',
  'b0000000-0000-4000-8000-000000000046'
);

do $$
begin
  if not exists (
    select 1 from public.student_memberships
    where id = current_setting('test.membership_id')::uuid
      and status = 'cancelled'
      and cancelled_at is not null
  ) then
    raise exception 'membership cancellation was not stored';
  end if;
  if (select count(*) from public.instructor_financial_events) <> 6 then
    raise exception 'each lifecycle transition must append one event';
  end if;
  if exists (
    select 1 from public.student_memberships
    where status in ('active', 'past_due')
  ) then
    raise exception 'non-current membership participated as current';
  end if;

  begin
    perform public.transition_student_membership(
      'b0000000-0000-4000-8000-000000000001',
      current_setting('test.membership_id')::uuid,
      'renew', '2026-10-13',
      'b0000000-0000-4000-8000-000000000011',
      'b0000000-0000-4000-8000-000000000047'
    );
    raise exception 'cancelled membership was renewed';
  exception when check_violation then null;
  end;
end;
$$;

rollback;