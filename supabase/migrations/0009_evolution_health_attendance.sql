-- Stage 4: configurable evolution metrics, health history, attendance, and alerts.

create table if not exists public.metric_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  category text not null check (length(trim(category)) > 0),
  value_type text not null
    check (value_type in ('numeric', 'percentage', 'duration', 'selection', 'object')),
  unit text,
  validation_rules jsonb not null default '{}'::jsonb
    check (jsonb_typeof(validation_rules) = 'object'),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, slug)
);

create table if not exists public.metric_evaluations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null,
  author_membership_id uuid not null,
  evaluated_at timestamptz not null default now(),
  values jsonb not null
    check (jsonb_typeof(values) = 'object' and values <> '{}'::jsonb),
  notes text,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete restrict,
  foreign key (tenant_id, author_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete restrict
);

create table if not exists public.health_conditions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  source text not null check (length(trim(source)) > 0),
  notes text,
  started_on date,
  status text not null default 'active' check (status in ('active', 'resolved')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (
    (status = 'active' and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  ),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete restrict
);

create table if not exists public.injuries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  body_area text,
  pain_level smallint check (pain_level between 0 and 10),
  source text not null check (length(trim(source)) > 0),
  notes text,
  occurred_on date,
  status text not null default 'active' check (status in ('active', 'resolved')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (
    (status = 'active' and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  ),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete restrict
);

create table if not exists public.health_restrictions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null,
  condition_id uuid,
  injury_id uuid,
  description text not null check (length(trim(description)) > 0),
  operational_action text not null check (length(trim(operational_action)) > 0),
  severity text not null check (severity in ('red', 'yellow', 'green')),
  source text not null check (length(trim(source)) > 0),
  starts_on date not null,
  ends_on date,
  status text not null default 'active' check (status in ('active', 'resolved')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (num_nonnulls(condition_id, injury_id) <= 1),
  check (ends_on is null or ends_on >= starts_on),
  check (
    (status = 'active' and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  ),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete restrict,
  foreign key (tenant_id, condition_id)
    references public.health_conditions(tenant_id, id) on delete restrict,
  foreign key (tenant_id, injury_id)
    references public.injuries(tenant_id, id) on delete restrict
);

create table if not exists public.class_session_attendance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id uuid not null,
  student_id uuid not null,
  recorded_by_membership_id uuid not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  note text,
  operation_id uuid,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, session_id, student_id),
  unique (tenant_id, operation_id),
  foreign key (tenant_id, session_id)
    references public.class_sessions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete restrict,
  foreign key (tenant_id, recorded_by_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete restrict
);

create table if not exists public.student_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null,
  class_session_id uuid,
  category text not null
    check (category in ('health', 'injury', 'restriction', 'attendance', 'abandonment')),
  severity text not null check (severity in ('red', 'yellow', 'green')),
  reason text not null check (length(trim(reason)) > 0),
  operational_action text not null check (length(trim(operational_action)) > 0),
  period_start date,
  period_end date,
  deduplication_key text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (period_end is null or period_start is null or period_end >= period_start),
  check (
    (status = 'open' and resolved_at is null)
    or (status = 'resolved' and resolved_at is not null)
  ),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete restrict,
  foreign key (tenant_id, class_session_id)
    references public.class_sessions(tenant_id, id) on delete cascade
);

create table if not exists public.sensitive_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_membership_id uuid,
  action text not null check (action in ('read', 'insert', 'update', 'delete')),
  entity_type text not null check (length(trim(entity_type)) > 0),
  entity_id uuid not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete set null (student_id),
  foreign key (tenant_id, actor_membership_id)
    references public.tenant_memberships(tenant_id, id)
    on delete set null (actor_membership_id)
);

create index if not exists metric_definitions_tenant_status_idx
  on public.metric_definitions (tenant_id, status, category, slug);
create index if not exists metric_evaluations_tenant_student_date_idx
  on public.metric_evaluations (tenant_id, student_id, evaluated_at desc);
create index if not exists metric_evaluations_values_idx
  on public.metric_evaluations using gin (values);
create index if not exists health_conditions_tenant_student_date_idx
  on public.health_conditions (tenant_id, student_id, created_at desc);
create index if not exists injuries_tenant_student_date_idx
  on public.injuries (tenant_id, student_id, created_at desc);
create index if not exists health_restrictions_tenant_student_date_idx
  on public.health_restrictions (tenant_id, student_id, starts_on desc);
create index if not exists class_session_attendance_tenant_student_date_idx
  on public.class_session_attendance (tenant_id, student_id, recorded_at desc);
create index if not exists class_session_attendance_session_status_idx
  on public.class_session_attendance (tenant_id, session_id, status);
create index if not exists student_alerts_tenant_student_date_idx
  on public.student_alerts (tenant_id, student_id, created_at desc);
create index if not exists student_alerts_open_idx
  on public.student_alerts (tenant_id, status, severity, created_at desc)
  where status = 'open';
create unique index if not exists student_alerts_open_deduplication_idx
  on public.student_alerts (tenant_id, student_id, deduplication_key)
  where status = 'open' and deduplication_key is not null;
create index if not exists sensitive_audit_log_tenant_student_date_idx
  on public.sensitive_audit_log (tenant_id, student_id, occurred_at desc);

create or replace function public.set_health_record_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_metric_definitions_updated_at
  before update on public.metric_definitions
  for each row execute function public.set_health_record_updated_at();
create trigger set_health_conditions_updated_at
  before update on public.health_conditions
  for each row execute function public.set_health_record_updated_at();
create trigger set_injuries_updated_at
  before update on public.injuries
  for each row execute function public.set_health_record_updated_at();
create trigger set_health_restrictions_updated_at
  before update on public.health_restrictions
  for each row execute function public.set_health_record_updated_at();
create trigger set_class_session_attendance_updated_at
  before update on public.class_session_attendance
  for each row execute function public.set_health_record_updated_at();
create trigger set_student_alerts_updated_at
  before update on public.student_alerts
  for each row execute function public.set_health_record_updated_at();

create or replace function public.can_access_student_health(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.current_membership_role(target_tenant)
    in ('owner', 'admin', 'instructor');
$$;

create or replace function public.can_review_sensitive_audit(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.current_membership_role(target_tenant) in ('owner', 'admin');
$$;

create or replace function public.audit_sensitive_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  source_record record;
begin
  if tg_op = 'DELETE' then
    source_record := old;
  else
    source_record := new;
  end if;

  insert into public.sensitive_audit_log (
    tenant_id,
    student_id,
    actor_user_id,
    actor_membership_id,
    action,
    entity_type,
    entity_id
  ) values (
    source_record.tenant_id,
    source_record.student_id,
    auth.uid(),
    public.current_membership_id(source_record.tenant_id),
    lower(tg_op),
    tg_table_name,
    source_record.id
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.record_sensitive_access(
  target_tenant uuid,
  target_student uuid,
  target_entity_type text,
  target_entity_id uuid
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  audit_id uuid;
begin
  if not public.can_access_student_health(target_tenant) then
    raise exception 'sensitive health access denied' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.students student
    where student.tenant_id = target_tenant
      and student.id = target_student
  ) then
    raise exception 'student not found' using errcode = 'P0002';
  end if;
  if length(trim(target_entity_type)) = 0 then
    raise exception 'entity type is required' using errcode = '23514';
  end if;

  insert into public.sensitive_audit_log (
    tenant_id,
    student_id,
    actor_user_id,
    actor_membership_id,
    action,
    entity_type,
    entity_id
  ) values (
    target_tenant,
    target_student,
    auth.uid(),
    public.current_membership_id(target_tenant),
    'read',
    target_entity_type,
    target_entity_id
  )
  returning id into audit_id;

  return audit_id;
end;
$$;

revoke all on function public.can_access_student_health(uuid) from public;
revoke all on function public.can_review_sensitive_audit(uuid) from public;
revoke all on function public.audit_sensitive_change() from public;
revoke all on function public.record_sensitive_access(uuid, uuid, text, uuid) from public;
grant execute on function public.can_access_student_health(uuid) to authenticated;
grant execute on function public.can_review_sensitive_audit(uuid) to authenticated;
grant execute on function public.record_sensitive_access(uuid, uuid, text, uuid) to authenticated;

create trigger audit_metric_evaluations
  after insert or update or delete on public.metric_evaluations
  for each row execute function public.audit_sensitive_change();
create trigger audit_health_conditions
  after insert or update or delete on public.health_conditions
  for each row execute function public.audit_sensitive_change();
create trigger audit_injuries
  after insert or update or delete on public.injuries
  for each row execute function public.audit_sensitive_change();
create trigger audit_health_restrictions
  after insert or update or delete on public.health_restrictions
  for each row execute function public.audit_sensitive_change();
create trigger audit_student_alerts
  after insert or update or delete on public.student_alerts
  for each row execute function public.audit_sensitive_change();

alter table public.metric_definitions enable row level security;
alter table public.metric_evaluations enable row level security;
alter table public.health_conditions enable row level security;
alter table public.injuries enable row level security;
alter table public.health_restrictions enable row level security;
alter table public.class_session_attendance enable row level security;
alter table public.student_alerts enable row level security;
alter table public.sensitive_audit_log enable row level security;

create policy metric_definitions_select on public.metric_definitions for select
  using (public.can_access_student_health(tenant_id));
create policy metric_definitions_insert on public.metric_definitions for insert
  with check (public.can_access_student_health(tenant_id));
create policy metric_definitions_update on public.metric_definitions for update
  using (public.can_access_student_health(tenant_id))
  with check (public.can_access_student_health(tenant_id));

create policy metric_evaluations_select on public.metric_evaluations for select
  using (public.can_access_student_health(tenant_id));
create policy metric_evaluations_insert on public.metric_evaluations for insert
  with check (
    public.can_access_student_health(tenant_id)
    and author_membership_id = public.current_membership_id(tenant_id)
  );

create policy health_conditions_select on public.health_conditions for select
  using (public.can_access_student_health(tenant_id));
create policy health_conditions_insert on public.health_conditions for insert
  with check (public.can_access_student_health(tenant_id));
create policy health_conditions_update on public.health_conditions for update
  using (public.can_access_student_health(tenant_id))
  with check (public.can_access_student_health(tenant_id));

create policy injuries_select on public.injuries for select
  using (public.can_access_student_health(tenant_id));
create policy injuries_insert on public.injuries for insert
  with check (public.can_access_student_health(tenant_id));
create policy injuries_update on public.injuries for update
  using (public.can_access_student_health(tenant_id))
  with check (public.can_access_student_health(tenant_id));

create policy health_restrictions_select on public.health_restrictions for select
  using (public.can_access_student_health(tenant_id));
create policy health_restrictions_insert on public.health_restrictions for insert
  with check (public.can_access_student_health(tenant_id));
create policy health_restrictions_update on public.health_restrictions for update
  using (public.can_access_student_health(tenant_id))
  with check (public.can_access_student_health(tenant_id));

create policy class_session_attendance_select on public.class_session_attendance for select
  using (public.can_manage_session_enrollments(tenant_id, session_id));
create policy class_session_attendance_insert on public.class_session_attendance for insert
  with check (
    public.can_manage_session_enrollments(tenant_id, session_id)
    and recorded_by_membership_id = public.current_membership_id(tenant_id)
  );
create policy class_session_attendance_update on public.class_session_attendance for update
  using (public.can_manage_session_enrollments(tenant_id, session_id))
  with check (
    public.can_manage_session_enrollments(tenant_id, session_id)
    and recorded_by_membership_id = public.current_membership_id(tenant_id)
  );

create policy student_alerts_select on public.student_alerts for select
  using (public.can_access_student_health(tenant_id));
create policy student_alerts_insert on public.student_alerts for insert
  with check (public.can_access_student_health(tenant_id));
create policy student_alerts_update on public.student_alerts for update
  using (public.can_access_student_health(tenant_id))
  with check (public.can_access_student_health(tenant_id));

create policy sensitive_audit_log_select on public.sensitive_audit_log for select
  using (public.can_review_sensitive_audit(tenant_id));
