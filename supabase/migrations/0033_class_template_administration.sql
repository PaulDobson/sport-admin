-- Never cascade deletion of a class into its recurring schedules.
alter table public.class_schedules
  drop constraint class_schedules_tenant_id_class_template_id_fkey,
  add constraint class_schedules_tenant_id_class_template_id_fkey
    foreign key (tenant_id, class_template_id)
    references public.class_templates(tenant_id, id) on delete restrict;

create index if not exists class_schedules_template_idx
  on public.class_schedules (tenant_id, class_template_id);
create index if not exists class_sessions_template_idx
  on public.class_sessions (tenant_id, class_template_id);

-- Usage counts must include other instructors and historical records, even
-- when their session/schedule details are hidden by assignment-scoped RLS.
create or replace function public.list_class_templates_for_administration(
  target_tenant_id uuid
)
returns table (
  id uuid,
  name text,
  capacity integer,
  discipline_name text,
  schedule_count bigint,
  session_count bigint
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce(public.can_manage_student_records(target_tenant_id), false) then
    raise exception 'You cannot manage classes for this academy' using errcode = '42501';
  end if;

  return query
    select template.id, template.name, template.capacity, discipline.name,
      (select count(*) from public.class_schedules schedule
       where schedule.tenant_id = template.tenant_id
         and schedule.class_template_id = template.id),
      (select count(*) from public.class_sessions session
       where session.tenant_id = template.tenant_id
         and session.class_template_id = template.id)
    from public.class_templates template
    join public.disciplines discipline
      on discipline.tenant_id = template.tenant_id
     and discipline.id = template.discipline_id
    where template.tenant_id = target_tenant_id
      and template.status = 'active'
    order by template.name, template.id;
end;
$$;

revoke all on function public.list_class_templates_for_administration(uuid) from public, anon;
grant execute on function public.list_class_templates_for_administration(uuid) to authenticated;
