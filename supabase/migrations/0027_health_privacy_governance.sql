-- Stage 9: fail-closed health governance, consent history, data rights, and erasure requests.

create table if not exists public.tenant_privacy_policies (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  jurisdiction_code text not null check (jurisdiction_code ~ '^[A-Z][A-Z0-9_-]{1,31}$'),
  policy_version text not null check (length(trim(policy_version)) between 1 and 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  health_enabled boolean not null default false,
  retention_hold boolean not null default true,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    not health_enabled
    or (status = 'approved' and approved_at is not null and approved_by is not null)
  )
);

create table if not exists public.health_consent_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null,
  declared_by_membership_id uuid not null,
  decision text not null check (decision in ('granted', 'revoked')),
  policy_version text not null check (length(trim(policy_version)) between 1 and 80),
  operation_id uuid not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, operation_id),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete restrict,
  foreign key (tenant_id, declared_by_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete restrict
);

create table if not exists public.student_erasure_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null,
  requested_by_membership_id uuid not null,
  reason_code text not null check (
    reason_code in ('subject_request', 'consent_withdrawn', 'tenant_request')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'blocked', 'cancelled', 'completed')
  ),
  requested_at timestamptz not null default now(),
  execute_after timestamptz not null default (now() + interval '30 days'),
  retention_hold boolean not null default true,
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete restrict,
  foreign key (tenant_id, requested_by_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete restrict,
  check (execute_after >= requested_at + interval '30 days'),
  check ((status = 'completed') = (completed_at is not null))
);

create unique index if not exists student_erasure_requests_open_idx
  on public.student_erasure_requests (tenant_id, student_id)
  where status in ('pending', 'approved', 'blocked');
create index if not exists health_consent_events_current_idx
  on public.health_consent_events (tenant_id, student_id, occurred_at desc, created_at desc);

create trigger set_tenant_privacy_policies_updated_at
  before update on public.tenant_privacy_policies
  for each row execute function public.set_health_record_updated_at();

create or replace function public.prevent_privacy_history_mutation()
returns trigger language plpgsql set search_path = public
as $$
begin
  raise exception 'privacy history is immutable' using errcode = '42501';
end;
$$;

create trigger prevent_health_consent_event_update
  before update or delete on public.health_consent_events
  for each row execute function public.prevent_privacy_history_mutation();

create or replace function public.is_health_policy_approved(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((
    select policy.status = 'approved'
      and policy.health_enabled
      and policy.approved_at is not null
      and policy.approved_by is not null
    from public.tenant_privacy_policies policy
    where policy.tenant_id = target_tenant
  ), false);
$$;

create or replace function public.can_access_student_health(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(
    public.current_membership_role(target_tenant) in ('owner', 'admin', 'instructor')
    and public.is_health_policy_approved(target_tenant),
    false
  );
$$;

create or replace function public.has_current_health_consent(
  target_tenant uuid,
  target_student uuid
)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((
    select consent.decision = 'granted'
      and consent.policy_version = policy.policy_version
    from public.tenant_privacy_policies policy
    join lateral (
      select event.decision, event.policy_version
      from public.health_consent_events event
      where event.tenant_id = target_tenant
        and event.student_id = target_student
      order by event.occurred_at desc, event.created_at desc, event.id desc
      limit 1
    ) consent on true
    where policy.tenant_id = target_tenant
      and policy.status = 'approved'
      and policy.health_enabled
      and public.current_membership_role(target_tenant) in ('owner', 'admin', 'instructor')
  ), false);
$$;

create or replace function public.can_process_student_health(
  target_tenant uuid,
  target_student uuid
)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.can_access_student_health(target_tenant)
    and public.has_current_health_consent(target_tenant, target_student);
$$;

create or replace function public.register_health_consent(
  target_tenant uuid,
  target_student uuid,
  target_policy_version text,
  target_decision text,
  target_operation_id uuid
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  actor_membership uuid;
  consent_id uuid;
begin
  if coalesce(
    public.current_membership_role(target_tenant) in ('owner', 'admin', 'instructor'),
    false
  ) is not true then
    raise exception 'health consent access denied' using errcode = '42501';
  end if;
  actor_membership := public.current_membership_id(target_tenant);
  if not exists (
    select 1 from public.students student
    where student.tenant_id = target_tenant and student.id = target_student
  ) then
    raise exception 'student not found' using errcode = 'P0002';
  end if;
  if target_decision not in ('granted', 'revoked') then
    raise exception 'invalid consent decision' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.tenant_privacy_policies policy
    where policy.tenant_id = target_tenant
      and policy.policy_version = target_policy_version
  ) then
    raise exception 'privacy policy version not found' using errcode = 'P0002';
  end if;
  if target_decision = 'granted' and not exists (
    select 1 from public.tenant_privacy_policies policy
    where policy.tenant_id = target_tenant
      and policy.policy_version = target_policy_version
      and policy.status = 'approved'
      and policy.health_enabled
  ) then
    raise exception 'health policy is not approved' using errcode = '42501';
  end if;

  insert into public.health_consent_events (
    tenant_id, student_id, declared_by_membership_id, decision,
    policy_version, operation_id
  ) values (
    target_tenant, target_student, actor_membership, target_decision,
    target_policy_version, target_operation_id
  )
  on conflict (tenant_id, operation_id) do nothing
  returning id into consent_id;

  if consent_id is null then
    select event.id into consent_id
    from public.health_consent_events event
    where event.tenant_id = target_tenant
      and event.operation_id = target_operation_id;
  end if;

  return consent_id;
end;
$$;

create or replace function public.export_student_personal_data(
  target_tenant uuid,
  target_student uuid
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.can_access_student_health(target_tenant) then
    raise exception 'personal data export denied' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.students student
    where student.tenant_id = target_tenant and student.id = target_student
  ) then
    raise exception 'student not found' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'student', to_jsonb(student) - 'tenant_id',
    'contacts', coalesce((
      select jsonb_agg(to_jsonb(contact) - 'tenant_id' order by contact.created_at)
      from public.student_contacts contact
      where contact.tenant_id = target_tenant and contact.student_id = target_student
    ), '[]'::jsonb),
    'metricEvaluations', coalesce((
      select jsonb_agg(to_jsonb(evaluation) - 'tenant_id' order by evaluation.evaluated_at)
      from public.metric_evaluations evaluation
      where evaluation.tenant_id = target_tenant and evaluation.student_id = target_student
    ), '[]'::jsonb),
    'healthConditions', coalesce((
      select jsonb_agg(to_jsonb(condition) - 'tenant_id' order by condition.created_at)
      from public.health_conditions condition
      where condition.tenant_id = target_tenant and condition.student_id = target_student
    ), '[]'::jsonb),
    'injuries', coalesce((
      select jsonb_agg(to_jsonb(injury) - 'tenant_id' order by injury.created_at)
      from public.injuries injury
      where injury.tenant_id = target_tenant and injury.student_id = target_student
    ), '[]'::jsonb),
    'restrictions', coalesce((
      select jsonb_agg(to_jsonb(restriction) - 'tenant_id' order by restriction.created_at)
      from public.health_restrictions restriction
      where restriction.tenant_id = target_tenant and restriction.student_id = target_student
    ), '[]'::jsonb),
    'attendance', coalesce((
      select jsonb_agg(to_jsonb(attendance) - 'tenant_id' order by attendance.recorded_at)
      from public.class_session_attendance attendance
      where attendance.tenant_id = target_tenant and attendance.student_id = target_student
    ), '[]'::jsonb),
    'memberships', coalesce((
      select jsonb_agg(to_jsonb(membership) - 'tenant_id' order by membership.created_at)
      from public.student_memberships membership
      where membership.tenant_id = target_tenant and membership.student_id = target_student
    ), '[]'::jsonb)
  ) into result
  from public.students student
  where student.tenant_id = target_tenant and student.id = target_student;

  insert into public.sensitive_audit_log (
    tenant_id, student_id, actor_user_id, actor_membership_id,
    action, entity_type, entity_id, metadata
  ) values (
    target_tenant, target_student, auth.uid(), public.current_membership_id(target_tenant),
    'read', 'personal_data_export', target_student, '{"scope":"student"}'::jsonb
  );

  return result;
end;
$$;

create or replace function public.correct_student_personal_data(
  target_tenant uuid,
  target_student uuid,
  corrected_full_name text default null,
  corrected_birth_date date default null
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  changed_fields text[] := '{}'::text[];
begin
  if not public.can_access_student_health(target_tenant) then
    raise exception 'personal data correction denied' using errcode = '42501';
  end if;
  if corrected_full_name is null and corrected_birth_date is null then
    raise exception 'at least one correction is required' using errcode = '23514';
  end if;
  if corrected_full_name is not null and length(trim(corrected_full_name)) = 0 then
    raise exception 'full name cannot be empty' using errcode = '23514';
  end if;

  update public.students
  set full_name = coalesce(trim(corrected_full_name), full_name),
      birth_date = coalesce(corrected_birth_date, birth_date)
  where tenant_id = target_tenant and id = target_student;
  if not found then
    raise exception 'student not found' using errcode = 'P0002';
  end if;

  if corrected_full_name is not null then
    changed_fields := array_append(changed_fields, 'full_name');
  end if;
  if corrected_birth_date is not null then
    changed_fields := array_append(changed_fields, 'birth_date');
  end if;

  insert into public.sensitive_audit_log (
    tenant_id, student_id, actor_user_id, actor_membership_id,
    action, entity_type, entity_id, metadata
  ) values (
    target_tenant, target_student, auth.uid(), public.current_membership_id(target_tenant),
    'update', 'student_personal_data', target_student,
    jsonb_build_object('changed_fields', to_jsonb(changed_fields))
  );
end;
$$;

create or replace function public.request_student_erasure(
  target_tenant uuid,
  target_student uuid,
  target_reason_code text
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  request_id uuid;
  actor_membership uuid;
  hold_required boolean;
begin
  if coalesce(
    public.current_membership_role(target_tenant) in ('owner', 'admin', 'instructor'),
    false
  ) is not true then
    raise exception 'student erasure request denied' using errcode = '42501';
  end if;
  if target_reason_code not in ('subject_request', 'consent_withdrawn', 'tenant_request') then
    raise exception 'invalid erasure reason' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.students student
    where student.tenant_id = target_tenant and student.id = target_student
  ) then
    raise exception 'student not found' using errcode = 'P0002';
  end if;

  actor_membership := public.current_membership_id(target_tenant);
  select coalesce(policy.retention_hold, true)
  into hold_required
  from public.tenant_privacy_policies policy
  where policy.tenant_id = target_tenant;
  hold_required := coalesce(hold_required, true);

  insert into public.student_erasure_requests (
    tenant_id, student_id, requested_by_membership_id, reason_code,
    status, retention_hold
  ) values (
    target_tenant, target_student, actor_membership, target_reason_code,
    case when hold_required then 'blocked' else 'pending' end,
    hold_required
  )
  on conflict (tenant_id, student_id)
    where status in ('pending', 'approved', 'blocked')
  do update set reason_code = excluded.reason_code
  returning id into request_id;

  insert into public.sensitive_audit_log (
    tenant_id, student_id, actor_user_id, actor_membership_id,
    action, entity_type, entity_id, metadata
  ) values (
    target_tenant, target_student, auth.uid(), actor_membership,
    'insert', 'student_erasure_request', request_id,
    jsonb_build_object('execute_after_days', 30, 'retention_hold', hold_required)
  );

  return request_id;
end;
$$;

revoke all on function public.prevent_privacy_history_mutation() from public;
revoke all on function public.is_health_policy_approved(uuid) from public;
revoke all on function public.has_current_health_consent(uuid, uuid) from public;
revoke all on function public.can_process_student_health(uuid, uuid) from public;
revoke all on function public.register_health_consent(uuid, uuid, text, text, uuid) from public;
revoke all on function public.export_student_personal_data(uuid, uuid) from public;
revoke all on function public.correct_student_personal_data(uuid, uuid, text, date) from public;
revoke all on function public.request_student_erasure(uuid, uuid, text) from public;
grant execute on function public.is_health_policy_approved(uuid) to authenticated;
grant execute on function public.has_current_health_consent(uuid, uuid) to authenticated;
grant execute on function public.can_process_student_health(uuid, uuid) to authenticated;
grant execute on function public.register_health_consent(uuid, uuid, text, text, uuid) to authenticated;
grant execute on function public.export_student_personal_data(uuid, uuid) to authenticated;
grant execute on function public.correct_student_personal_data(uuid, uuid, text, date) to authenticated;
grant execute on function public.request_student_erasure(uuid, uuid, text) to authenticated;

alter table public.tenant_privacy_policies enable row level security;
alter table public.health_consent_events enable row level security;
alter table public.student_erasure_requests enable row level security;

create policy tenant_privacy_policies_select on public.tenant_privacy_policies for select
  using (
    public.current_membership_role(tenant_id) in ('owner', 'admin', 'instructor')
  );
create policy health_consent_events_select on public.health_consent_events for select
  using (
    public.current_membership_role(tenant_id) in ('owner', 'admin', 'instructor')
  );
create policy student_erasure_requests_select on public.student_erasure_requests for select
  using (public.current_membership_role(tenant_id) in ('owner', 'admin'));

grant select on public.tenant_privacy_policies to authenticated;
grant select on public.health_consent_events to authenticated;
grant select on public.student_erasure_requests to authenticated;

drop policy if exists metric_evaluations_insert on public.metric_evaluations;
create policy metric_evaluations_insert on public.metric_evaluations for insert
  with check (
    public.can_process_student_health(tenant_id, student_id)
    and author_membership_id = public.current_membership_id(tenant_id)
  );

drop policy if exists health_conditions_insert on public.health_conditions;
drop policy if exists health_conditions_update on public.health_conditions;
create policy health_conditions_insert on public.health_conditions for insert
  with check (public.can_process_student_health(tenant_id, student_id));
create policy health_conditions_update on public.health_conditions for update
  using (public.can_process_student_health(tenant_id, student_id))
  with check (public.can_process_student_health(tenant_id, student_id));

drop policy if exists injuries_insert on public.injuries;
drop policy if exists injuries_update on public.injuries;
create policy injuries_insert on public.injuries for insert
  with check (public.can_process_student_health(tenant_id, student_id));
create policy injuries_update on public.injuries for update
  using (public.can_process_student_health(tenant_id, student_id))
  with check (public.can_process_student_health(tenant_id, student_id));

drop policy if exists health_restrictions_insert on public.health_restrictions;
drop policy if exists health_restrictions_update on public.health_restrictions;
create policy health_restrictions_insert on public.health_restrictions for insert
  with check (public.can_process_student_health(tenant_id, student_id));
create policy health_restrictions_update on public.health_restrictions for update
  using (public.can_process_student_health(tenant_id, student_id))
  with check (public.can_process_student_health(tenant_id, student_id));

drop policy if exists student_alerts_insert on public.student_alerts;
drop policy if exists student_alerts_update on public.student_alerts;
create policy student_alerts_insert on public.student_alerts for insert
  with check (
    public.can_access_student_health(tenant_id)
    and (
      category not in ('health', 'injury', 'restriction')
      or public.has_current_health_consent(tenant_id, student_id)
    )
  );
create policy student_alerts_update on public.student_alerts for update
  using (public.can_access_student_health(tenant_id))
  with check (
    public.can_access_student_health(tenant_id)
    and (
      category not in ('health', 'injury', 'restriction')
      or public.has_current_health_consent(tenant_id, student_id)
    )
  );
