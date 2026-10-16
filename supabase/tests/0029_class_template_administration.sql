-- Run after migration 0033. Replace these IDs with two existing Auth users.
begin;
select set_config('test.owner', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.other_user', '810363c9-4041-4ec2-a54a-1508d308e58d', true);
do $$
begin
  if current_setting('test.owner') = current_setting('test.other_user')
    or (select count(*) from auth.users
        where id in (current_setting('test.owner')::uuid, current_setting('test.other_user')::uuid)) <> 2 then
    raise exception 'Configure two distinct existing Auth users.';
  end if;
end;
$$;

insert into public.tenants (id, name, status)
values ('83300000-0000-4000-8000-000000000001', 'Class Administration Test', 'active');
insert into public.tenant_memberships (id, tenant_id, user_id, role, status) values
('83300000-0000-4000-8000-000000000011', '83300000-0000-4000-8000-000000000001', current_setting('test.owner')::uuid, 'owner', 'active'),
('83300000-0000-4000-8000-000000000012', '83300000-0000-4000-8000-000000000001', current_setting('test.other_user')::uuid, 'instructor', 'active');
insert into public.locations (id, tenant_id, name, type)
values ('83300000-0000-4000-8000-000000000021', '83300000-0000-4000-8000-000000000001', 'Test Room', 'external_gym');
insert into public.disciplines (id, tenant_id, name, status)
values ('83300000-0000-4000-8000-000000000031', '83300000-0000-4000-8000-000000000001', 'Test Discipline', 'archived');
insert into public.class_templates (id, tenant_id, discipline_id, name, capacity) values
('83300000-0000-4000-8000-000000000041', '83300000-0000-4000-8000-000000000001', '83300000-0000-4000-8000-000000000031', 'Used Class', 16),
('83300000-0000-4000-8000-000000000042', '83300000-0000-4000-8000-000000000001', '83300000-0000-4000-8000-000000000031', 'Free Class', 16),
('83300000-0000-4000-8000-000000000043', '83300000-0000-4000-8000-000000000001', '83300000-0000-4000-8000-000000000031', 'Schedule Only', 16),
('83300000-0000-4000-8000-000000000044', '83300000-0000-4000-8000-000000000001', '83300000-0000-4000-8000-000000000031', 'Stale Catalog Class', 16);
insert into public.class_schedules (
  id, tenant_id, class_template_id, location_id, instructor_membership_id,
  day_of_week, starts_at, ends_at, timezone, status
) values
('83300000-0000-4000-8000-000000000051', '83300000-0000-4000-8000-000000000001', '83300000-0000-4000-8000-000000000041', '83300000-0000-4000-8000-000000000021', '83300000-0000-4000-8000-000000000011', 1, '10:00', '11:00', 'America/Santiago', 'archived'),
('83300000-0000-4000-8000-000000000052', '83300000-0000-4000-8000-000000000001', '83300000-0000-4000-8000-000000000043', '83300000-0000-4000-8000-000000000021', '83300000-0000-4000-8000-000000000011', 1, '12:00', '13:00', 'America/Santiago', 'archived');
insert into public.class_sessions (
  id, tenant_id, class_schedule_id, class_template_id, location_id,
  instructor_membership_id, starts_at, ends_at, timezone, capacity, status
) values (
  '83300000-0000-4000-8000-000000000061', '83300000-0000-4000-8000-000000000001',
  '83300000-0000-4000-8000-000000000051', '83300000-0000-4000-8000-000000000041',
  '83300000-0000-4000-8000-000000000021', '83300000-0000-4000-8000-000000000011',
  now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 'America/Santiago', 16, 'completed'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.other_user'), true);
do $$
declare usage record;
begin
  if exists (select 1 from public.class_schedules where tenant_id = '83300000-0000-4000-8000-000000000001')
     or exists (select 1 from public.class_sessions where tenant_id = '83300000-0000-4000-8000-000000000001') then
    raise exception 'Instructor should not see another instructors schedule/session details.';
  end if;
  select * into usage from public.list_class_templates_for_administration('83300000-0000-4000-8000-000000000001')
  where id = '83300000-0000-4000-8000-000000000041';
  if usage.id is null or usage.schedule_count <> 1 or usage.session_count <> 1 then
    raise exception 'Usage counts must include historical records hidden by assignment-scoped RLS.';
  end if;
  begin
    delete from public.class_templates where id = '83300000-0000-4000-8000-000000000043';
    raise exception 'Deletion must not cascade into archived schedules.';
  exception when foreign_key_violation or restrict_violation then null;
  end;
  begin
    delete from public.class_templates where id = '83300000-0000-4000-8000-000000000041';
    raise exception 'Deletion must preserve sessions and schedules.';
  exception when foreign_key_violation or restrict_violation then null;
  end;
  begin
    perform public.list_class_templates_for_administration('83300000-0000-4000-8000-000000000099');
    raise exception 'Foreign tenant access must fail.';
  exception when insufficient_privilege then null;
  end;
  update public.class_templates set name = 'Updated Class', capacity = 8
  where id = '83300000-0000-4000-8000-000000000041';
  delete from public.class_templates where id = '83300000-0000-4000-8000-000000000042';
  if exists (select 1 from public.class_templates where id = '83300000-0000-4000-8000-000000000042') then
    raise exception 'Unreferenced class must be deleted.';
  end if;
  select * into usage from public.list_class_templates_for_administration('83300000-0000-4000-8000-000000000001')
  where id = '83300000-0000-4000-8000-000000000044';
  if usage.schedule_count <> 0 or usage.session_count <> 0 then
    raise exception 'Stale catalog fixture must initially be deletable.';
  end if;
  insert into public.class_schedules (
    id, tenant_id, class_template_id, location_id, instructor_membership_id,
    day_of_week, starts_at, ends_at, timezone
  ) values (
    '83300000-0000-4000-8000-000000000053', '83300000-0000-4000-8000-000000000001',
    '83300000-0000-4000-8000-000000000044', '83300000-0000-4000-8000-000000000021',
    '83300000-0000-4000-8000-000000000012', 2, '10:00', '11:00', 'America/Santiago'
  );
  begin
    delete from public.class_templates where id = '83300000-0000-4000-8000-000000000044';
    raise exception 'A reference created after catalog loading must prevent deletion.';
  exception when foreign_key_violation or restrict_violation then null;
  end;
end;
$$;

reset role;
do $$
begin
  if (select capacity from public.class_sessions where id = '83300000-0000-4000-8000-000000000061') <> 16 then
    raise exception 'Editing template capacity must not change published capacity.';
  end if;
  if not exists (select 1 from public.class_templates where id = '83300000-0000-4000-8000-000000000041' and capacity = 8 and name = 'Updated Class' and discipline_id = '83300000-0000-4000-8000-000000000031') then
    raise exception 'Editing must persist only name and capacity.';
  end if;
  if (select count(*) from public.class_schedules where tenant_id = '83300000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'Blocked deletions must preserve all schedules.';
  end if;
end;
$$;

update public.tenant_memberships set role = 'assistant'
where id = '83300000-0000-4000-8000-000000000012';
set local role authenticated;
do $$
begin
  begin
    perform public.list_class_templates_for_administration('83300000-0000-4000-8000-000000000001');
    raise exception 'Assistant access must fail.';
  exception when insufficient_privilege then null;
  end;
  update public.class_templates set capacity = 7 where id = '83300000-0000-4000-8000-000000000041';
  if found then raise exception 'Assistants cannot edit classes.'; end if;
  delete from public.class_templates where id = '83300000-0000-4000-8000-000000000041';
  if found then raise exception 'Assistants cannot delete classes.'; end if;
end;
$$;
reset role;
rollback;
