-- Run after migrations 0001-0010. Set two real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status) values
  ('90000000-0000-4000-8000-000000000001', 'Health Privacy Tenant', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status) values
  ('90000000-0000-4000-8000-000000000011', '90000000-0000-4000-8000-000000000001', current_setting('test.user_a')::uuid, 'owner', 'active'),
  ('90000000-0000-4000-8000-000000000012', '90000000-0000-4000-8000-000000000001', current_setting('test.user_b')::uuid, 'assistant', 'active');

insert into public.students (id, tenant_id, full_name) values
  ('90000000-0000-4000-8000-000000000021', '90000000-0000-4000-8000-000000000001', 'Private Health Student');

insert into public.health_conditions (
  id, tenant_id, student_id, name, source
) values (
  '90000000-0000-4000-8000-000000000031',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000021',
  'Private condition',
  'self_reported'
);
insert into public.injuries (
  id, tenant_id, student_id, name, source
) values (
  '90000000-0000-4000-8000-000000000032',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000021',
  'Private injury',
  'self_reported'
);
insert into public.health_restrictions (
  id, tenant_id, student_id, condition_id, description,
  operational_action, severity, source, starts_on
) values (
  '90000000-0000-4000-8000-000000000033',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000021',
  '90000000-0000-4000-8000-000000000031',
  'Private restriction',
  'Use adapted work',
  'yellow',
  'instructor_review',
  '2026-08-22'
);
insert into public.student_alerts (
  id, tenant_id, student_id, category, severity, reason, operational_action
) values (
  '90000000-0000-4000-8000-000000000034',
  '90000000-0000-4000-8000-000000000001',
  '90000000-0000-4000-8000-000000000021',
  'health',
  'yellow',
  'Private health alert',
  'Review before class'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);

do $$
declare
  affected integer;
begin
  if public.current_membership_role('90000000-0000-4000-8000-000000000001') <> 'assistant' then
    raise exception 'user B must be an assistant for the first privacy assertion';
  end if;
  if (select count(*) from public.health_conditions) <> 0
    or (select count(*) from public.injuries) <> 0
    or (select count(*) from public.health_restrictions) <> 0
    or (select count(*) from public.student_alerts) <> 0
    or (select count(*) from public.sensitive_audit_log) <> 0 then
    raise exception 'assistant received sensitive health data';
  end if;

  update public.health_conditions set notes = 'assistant change';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'assistant updated a health condition'; end if;
  update public.injuries set notes = 'assistant change';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'assistant updated an injury'; end if;
  update public.health_restrictions set description = 'assistant change';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'assistant updated a restriction'; end if;
  update public.student_alerts set reason = 'assistant change';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'assistant updated a health alert'; end if;

  begin
    insert into public.health_conditions (tenant_id, student_id, name, source)
    values (
      '90000000-0000-4000-8000-000000000001',
      '90000000-0000-4000-8000-000000000021',
      'Assistant condition',
      'invalid'
    );
    raise exception 'assistant inserted a health condition';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
update public.tenant_memberships
set status = 'revoked'
where id = '90000000-0000-4000-8000-000000000012';
insert into public.platform_admins (id)
values (current_setting('test.user_b')::uuid)
on conflict (id) do nothing;
set local role authenticated;

do $$
declare
  affected integer;
begin
  if not public.is_platform_admin() then
    raise exception 'user B must be a platform admin for the second privacy assertion';
  end if;
  if public.current_membership_role('90000000-0000-4000-8000-000000000001') is not null then
    raise exception 'platform admin must not retain an operational membership';
  end if;
  if (select count(*) from public.health_conditions) <> 0
    or (select count(*) from public.injuries) <> 0
    or (select count(*) from public.health_restrictions) <> 0
    or (select count(*) from public.student_alerts) <> 0
    or (select count(*) from public.sensitive_audit_log) <> 0 then
    raise exception 'platform admin received sensitive health data';
  end if;

  update public.health_conditions set notes = 'platform admin change';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'platform admin updated a health condition'; end if;
  update public.injuries set notes = 'platform admin change';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'platform admin updated an injury'; end if;
  update public.health_restrictions set description = 'platform admin change';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'platform admin updated a restriction'; end if;
  update public.student_alerts set reason = 'platform admin change';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'platform admin updated a health alert'; end if;

  begin
    insert into public.injuries (tenant_id, student_id, name, source)
    values (
      '90000000-0000-4000-8000-000000000001',
      '90000000-0000-4000-8000-000000000021',
      'Platform admin injury',
      'invalid'
    );
    raise exception 'platform admin inserted an injury';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;