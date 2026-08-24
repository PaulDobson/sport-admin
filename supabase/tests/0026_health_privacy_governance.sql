-- Run after migration 0027. Set two real auth user UUIDs below.
begin;

select set_config('test.owner_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.owner_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

create or replace function pg_temp.expect_denied(statement text)
returns void
language plpgsql
as $$
declare
  affected_rows bigint;
begin
  begin
    execute statement;
    get diagnostics affected_rows = row_count;
    if affected_rows <> 0 then
      raise exception 'statement unexpectedly affected % rows: %', affected_rows, statement;
    end if;
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

insert into public.tenants (id, name, status)
values
  ('28000000-0000-4000-8000-000000000001', 'Privacy Tenant A', 'active'),
  ('28000000-0000-4000-8000-000000000002', 'Privacy Tenant B', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  (
    '28000000-0000-4000-8000-000000000011',
    '28000000-0000-4000-8000-000000000001',
    current_setting('test.owner_a')::uuid,
    'owner',
    'active'
  ),
  (
    '28000000-0000-4000-8000-000000000012',
    '28000000-0000-4000-8000-000000000002',
    current_setting('test.owner_b')::uuid,
    'owner',
    'active'
  );

insert into public.students (id, tenant_id, full_name, birth_date)
values
  (
    '28000000-0000-4000-8000-000000000021',
    '28000000-0000-4000-8000-000000000001',
    'Privacy Student A',
    '2000-01-01'
  ),
  (
    '28000000-0000-4000-8000-000000000022',
    '28000000-0000-4000-8000-000000000002',
    'Privacy Student B',
    '2001-01-01'
  );

insert into public.tenant_privacy_policies (
  tenant_id, jurisdiction_code, policy_version, status,
  health_enabled, retention_hold
)
values
  (
    '28000000-0000-4000-8000-000000000001',
    'PENDING', 'draft-1', 'pending', false, true
  ),
  (
    '28000000-0000-4000-8000-000000000002',
    'PENDING', 'draft-1', 'pending', false, true
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner_a'), true);

do $$
declare
  governed_table text;
begin
  if not has_table_privilege('authenticated', 'public.health_conditions', 'INSERT') then
    raise exception 'authenticated role lacks health condition insert privilege';
  end if;
  foreach governed_table in array array[
    'metric_definitions',
    'metric_evaluations',
    'health_conditions',
    'injuries',
    'health_restrictions',
    'class_session_attendance',
    'student_alerts'
  ] loop
    if has_table_privilege(
      'authenticated',
      format('public.%I', governed_table),
      'DELETE'
    ) then
      raise exception 'authenticated role received delete privilege on %', governed_table;
    end if;
  end loop;
  if public.can_access_student_health('28000000-0000-4000-8000-000000000001') then
    raise exception 'health access was enabled without legal approval';
  end if;
end;
$$;

select pg_temp.expect_denied(
  'select public.register_health_consent(''28000000-0000-4000-8000-000000000001'', ''28000000-0000-4000-8000-000000000021'', ''draft-1'', ''granted'', ''28000000-0000-4000-8000-000000000031'')'
);
select pg_temp.expect_denied(
  'insert into public.health_conditions (tenant_id, student_id, name, source) values (''28000000-0000-4000-8000-000000000001'', ''28000000-0000-4000-8000-000000000021'', ''Blocked condition'', ''self_reported'')'
);

reset role;

update public.tenant_privacy_policies
set jurisdiction_code = 'LEGAL_REVIEWED',
    policy_version = 'approved-1',
    status = 'approved',
    health_enabled = true,
    approved_at = now(),
    approved_by = current_setting('test.owner_a')::uuid
where tenant_id = '28000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner_a'), true);

select public.register_health_consent(
  '28000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000021',
  'approved-1',
  'granted',
  '28000000-0000-4000-8000-000000000032'
);
select public.register_health_consent(
  '28000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000021',
  'approved-1',
  'granted',
  '28000000-0000-4000-8000-000000000032'
);

insert into public.health_conditions (
  id, tenant_id, student_id, name, source, notes
)
values (
  '28000000-0000-4000-8000-000000000041',
  '28000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000021',
  'Authorized condition',
  'self_reported',
  'Private detail'
);

do $$
declare
  exported jsonb;
begin
  if (select count(*) from public.health_consent_events) <> 1 then
    raise exception 'consent operation replay created a duplicate';
  end if;
  if not public.has_current_health_consent(
    '28000000-0000-4000-8000-000000000001',
    '28000000-0000-4000-8000-000000000021'
  ) then
    raise exception 'granted consent was not recognized';
  end if;

  exported := public.export_student_personal_data(
    '28000000-0000-4000-8000-000000000001',
    '28000000-0000-4000-8000-000000000021'
  );
  if exported #>> '{student,full_name}' <> 'Privacy Student A' then
    raise exception 'personal data export omitted the student';
  end if;
  if jsonb_array_length(exported -> 'healthConditions') <> 1 then
    raise exception 'personal data export omitted health history';
  end if;
end;
$$;

select public.correct_student_personal_data(
  '28000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000021',
  'Corrected Student A',
  '2000-02-02'
);
select public.request_student_erasure(
  '28000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000021',
  'subject_request'
);

reset role;

do $$
begin
  if not exists (
    select 1 from public.students
    where id = '28000000-0000-4000-8000-000000000021'
      and full_name = 'Corrected Student A'
      and birth_date = '2000-02-02'
  ) then
    raise exception 'personal data correction was not applied';
  end if;
  if not exists (
    select 1 from public.sensitive_audit_log
    where tenant_id = '28000000-0000-4000-8000-000000000001'
      and student_id = '28000000-0000-4000-8000-000000000021'
      and entity_type = 'personal_data_export'
      and action = 'read'
  ) then
    raise exception 'personal data export was not audited';
  end if;
  if not exists (
    select 1 from public.sensitive_audit_log
    where tenant_id = '28000000-0000-4000-8000-000000000001'
      and student_id = '28000000-0000-4000-8000-000000000021'
      and entity_type = 'student_personal_data'
      and action = 'update'
      and metadata -> 'changed_fields' ?& array['full_name', 'birth_date']
  ) then
    raise exception 'personal data correction was not audited';
  end if;
  if not exists (
    select 1 from public.student_erasure_requests
    where tenant_id = '28000000-0000-4000-8000-000000000001'
      and student_id = '28000000-0000-4000-8000-000000000021'
      and status = 'blocked'
      and retention_hold
      and execute_after >= requested_at + interval '30 days'
  ) then
    raise exception 'erasure request did not preserve the retention hold and waiting period';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner_a'), true);

select public.register_health_consent(
  '28000000-0000-4000-8000-000000000001',
  '28000000-0000-4000-8000-000000000021',
  'approved-1',
  'revoked',
  '28000000-0000-4000-8000-000000000033'
);

do $$
begin
  if public.has_current_health_consent(
    '28000000-0000-4000-8000-000000000001',
    '28000000-0000-4000-8000-000000000021'
  ) then
    raise exception 'revoked consent remained active';
  end if;
  if (select count(*) from public.health_conditions) <> 1 then
    raise exception 'consent revocation removed historical health data';
  end if;
end;
$$;

select pg_temp.expect_denied(
  'insert into public.injuries (tenant_id, student_id, name, source) values (''28000000-0000-4000-8000-000000000001'', ''28000000-0000-4000-8000-000000000021'', ''Blocked after revocation'', ''self_reported'')'
);

select set_config('request.jwt.claim.sub', current_setting('test.owner_b'), true);

do $$
begin
  if exists (
    select 1 from public.tenant_privacy_policies
    where tenant_id = '28000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'cross-tenant privacy policy was exposed';
  end if;
  if exists (
    select 1 from public.health_consent_events
    where tenant_id = '28000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'cross-tenant consent history was exposed';
  end if;
  if exists (
    select 1 from public.student_erasure_requests
    where tenant_id = '28000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'cross-tenant erasure request was exposed';
  end if;
end;
$$;

select pg_temp.expect_denied(
  'select public.export_student_personal_data(''28000000-0000-4000-8000-000000000001'', ''28000000-0000-4000-8000-000000000021'')'
);

reset role;

do $$
begin
  begin
    update public.health_consent_events
    set policy_version = 'tampered'
    where id = (
      select id from public.health_consent_events
      where tenant_id = '28000000-0000-4000-8000-000000000001'
      limit 1
    );
    raise exception 'consent history unexpectedly changed';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
