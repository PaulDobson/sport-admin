-- Run after migrations 0001-0009. Set two real auth user UUIDs below.
begin;

select set_config('test.user_a', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.user_b', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

insert into public.tenants (id, name, status)
values
  ('70000000-0000-4000-8000-000000000001', 'Health Tenant A', 'active'),
  ('70000000-0000-4000-8000-000000000002', 'Health Tenant B', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  (
    '70000000-0000-4000-8000-000000000011',
    '70000000-0000-4000-8000-000000000001',
    current_setting('test.user_a')::uuid,
    'owner',
    'active'
  ),
  (
    '70000000-0000-4000-8000-000000000012',
    '70000000-0000-4000-8000-000000000002',
    current_setting('test.user_b')::uuid,
    'owner',
    'active'
  );

insert into public.students (id, tenant_id, full_name)
values
  (
    '70000000-0000-4000-8000-000000000021',
    '70000000-0000-4000-8000-000000000001',
    'Health Student A'
  ),
  (
    '70000000-0000-4000-8000-000000000022',
    '70000000-0000-4000-8000-000000000002',
    'Health Student B'
  );

insert into public.locations (id, tenant_id, name, type)
values (
  '70000000-0000-4000-8000-000000000031',
  '70000000-0000-4000-8000-000000000001',
  'Health Park A',
  'park'
);

insert into public.disciplines (id, tenant_id, name)
values (
  '70000000-0000-4000-8000-000000000041',
  '70000000-0000-4000-8000-000000000001',
  'Health Discipline A'
);

insert into public.class_templates (id, tenant_id, discipline_id, name, capacity)
values (
  '70000000-0000-4000-8000-000000000051',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000041',
  'Health Class A',
  10
);

insert into public.class_schedules (
  id,
  tenant_id,
  class_template_id,
  location_id,
  instructor_membership_id,
  day_of_week,
  starts_at,
  ends_at,
  timezone
)
values (
  '70000000-0000-4000-8000-000000000061',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000051',
  '70000000-0000-4000-8000-000000000031',
  '70000000-0000-4000-8000-000000000011',
  1,
  '09:00',
  '10:00',
  'America/Argentina/Buenos_Aires'
);

insert into public.class_sessions (
  id,
  tenant_id,
  class_schedule_id,
  class_template_id,
  location_id,
  instructor_membership_id,
  starts_at,
  ends_at,
  timezone,
  capacity
)
values (
  '70000000-0000-4000-8000-000000000071',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000061',
  '70000000-0000-4000-8000-000000000051',
  '70000000-0000-4000-8000-000000000031',
  '70000000-0000-4000-8000-000000000011',
  '2026-08-24 12:00:00+00',
  '2026-08-24 13:00:00+00',
  'America/Argentina/Buenos_Aires',
  10
);

insert into public.platform_admins (id)
values (current_setting('test.user_b')::uuid)
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_a'), true);

insert into public.metric_definitions (
  id,
  tenant_id,
  slug,
  name,
  category,
  value_type,
  unit,
  validation_rules
)
values (
  '70000000-0000-4000-8000-000000000081',
  '70000000-0000-4000-8000-000000000001',
  'vertical-jump',
  'Vertical jump',
  'power',
  'numeric',
  'cm',
  '{"min": 0, "max": 150}'::jsonb
);

insert into public.metric_evaluations (
  id,
  tenant_id,
  student_id,
  author_membership_id,
  evaluated_at,
  values,
  notes
)
values (
  '70000000-0000-4000-8000-000000000082',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000021',
  '70000000-0000-4000-8000-000000000011',
  '2026-08-22 10:00:00+00',
  '{"vertical-jump": {"value": 42, "unit": "cm"}}'::jsonb,
  'Baseline evaluation'
);

insert into public.health_conditions (
  id,
  tenant_id,
  student_id,
  name,
  source,
  started_on
)
values (
  '70000000-0000-4000-8000-000000000091',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000021',
  'Asthma',
  'self_reported',
  '2025-01-01'
);

insert into public.injuries (
  id,
  tenant_id,
  student_id,
  name,
  body_area,
  pain_level,
  source,
  occurred_on
)
values (
  '70000000-0000-4000-8000-000000000092',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000021',
  'Ankle sprain',
  'left ankle',
  4,
  'self_reported',
  '2026-08-20'
);

insert into public.health_restrictions (
  id,
  tenant_id,
  student_id,
  injury_id,
  description,
  operational_action,
  severity,
  source,
  starts_on
)
values (
  '70000000-0000-4000-8000-000000000093',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000021',
  '70000000-0000-4000-8000-000000000092',
  'Avoid impact work',
  'Use low-impact alternatives',
  'yellow',
  'instructor_review',
  '2026-08-20'
);

insert into public.class_session_attendance (
  id,
  tenant_id,
  session_id,
  student_id,
  recorded_by_membership_id,
  status,
  operation_id
)
values (
  '70000000-0000-4000-8000-0000000000a1',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000071',
  '70000000-0000-4000-8000-000000000021',
  '70000000-0000-4000-8000-000000000011',
  'present',
  '70000000-0000-4000-8000-0000000000a2'
);

insert into public.student_alerts (
  id,
  tenant_id,
  student_id,
  class_session_id,
  category,
  severity,
  reason,
  operational_action,
  deduplication_key
)
values (
  '70000000-0000-4000-8000-0000000000b1',
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000021',
  '70000000-0000-4000-8000-000000000071',
  'restriction',
  'yellow',
  'Active ankle restriction',
  'Use low-impact alternatives',
  'restriction:70000000-0000-4000-8000-000000000093'
);

select public.record_sensitive_access(
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000021',
  'student_health_summary',
  '70000000-0000-4000-8000-000000000021'
);

update public.health_conditions
set status = 'resolved', resolved_at = '2026-08-22 12:00:00+00'
where id = '70000000-0000-4000-8000-000000000091';

do $$
declare
  affected integer;
begin
  if (select count(*) from public.metric_evaluations) <> 1 then
    raise exception 'metric evaluation was not stored';
  end if;
  if (select count(*) from public.health_conditions where status = 'resolved') <> 1 then
    raise exception 'health condition resolution was not preserved';
  end if;
  if (select count(*) from public.class_session_attendance where status = 'present') <> 1 then
    raise exception 'class session attendance was not stored';
  end if;
  if (select count(*) from public.student_alerts where status = 'open') <> 1 then
    raise exception 'student alert was not stored';
  end if;
  if (select count(*) from public.sensitive_audit_log) <> 7 then
    raise exception 'sensitive changes and read must produce seven audit events';
  end if;

  update public.metric_evaluations
  set notes = 'History was overwritten'
  where id = '70000000-0000-4000-8000-000000000082';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'metric evaluation history must be immutable';
  end if;
end;
$$;

reset role;

do $$
declare
  expected_index text;
begin
  foreach expected_index in array array[
    'metric_definitions_tenant_status_idx',
    'metric_evaluations_tenant_student_date_idx',
    'metric_evaluations_values_idx',
    'health_conditions_tenant_student_date_idx',
    'injuries_tenant_student_date_idx',
    'health_restrictions_tenant_student_date_idx',
    'class_session_attendance_tenant_student_date_idx',
    'class_session_attendance_session_status_idx',
    'student_alerts_tenant_student_date_idx',
    'student_alerts_open_idx',
    'student_alerts_open_deduplication_idx',
    'sensitive_audit_log_tenant_student_date_idx'
  ] loop
    if not exists (
      select 1
      from pg_indexes
      where schemaname = 'public' and indexname = expected_index
    ) then
      raise exception 'missing required index: %', expected_index;
    end if;
  end loop;

  if exists (
    select 1
    from pg_class table_definition
    join pg_namespace schema_definition
      on schema_definition.oid = table_definition.relnamespace
    where schema_definition.nspname = 'public'
      and table_definition.relname in (
        'metric_definitions',
        'metric_evaluations',
        'health_conditions',
        'injuries',
        'health_restrictions',
        'class_session_attendance',
        'student_alerts',
        'sensitive_audit_log'
      )
      and not table_definition.relrowsecurity
  ) then
    raise exception 'a stage 4 table is missing RLS';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.user_b'), true);

do $$
begin
  if not public.is_platform_admin() then
    raise exception 'user B must be a platform admin for the privacy assertion';
  end if;
  if (select count(*) from public.metric_evaluations) <> 0 then
    raise exception 'cross-tenant metric evaluation was exposed';
  end if;
  if (select count(*) from public.health_conditions) <> 0 then
    raise exception 'platform admin received cross-tenant health access';
  end if;
  if (select count(*) from public.class_session_attendance) <> 0 then
    raise exception 'cross-tenant attendance was exposed';
  end if;
  if (select count(*) from public.sensitive_audit_log) <> 0 then
    raise exception 'platform admin received sensitive audit access';
  end if;

  begin
    insert into public.health_conditions (
      tenant_id,
      student_id,
      name,
      source
    ) values (
      '70000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000021',
      'Cross-tenant condition',
      'invalid'
    );
    raise exception 'cross-tenant health insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
