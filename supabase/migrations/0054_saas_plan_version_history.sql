begin;

create function public.list_saas_plan_versions(
  target_plan uuid, page_number integer, page_size integer
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if target_plan is null or page_number is null or page_number not between 1 and 1000000
    or page_size is null or page_size not between 1 and 100 then
    raise exception 'Invalid plan history request' using errcode = '22023';
  end if;

  with versions as materialized (
    select v.* from public.saas_plan_versions v where v.plan_id = target_plan
  ), paged as (
    select * from versions order by version_number desc
    limit page_size offset (page_number - 1) * page_size
  )
  select jsonb_build_object(
    'plan_id', p.id, 'slug', p.slug, 'status', p.status,
    'current_version_id', p.current_version_id, 'queried_at', now(),
    'page', page_number, 'page_size', page_size,
    'total', (select count(*) from versions),
    'versions', coalesce((select jsonb_agg(to_jsonb(v) - 'created_by'
      order by v.version_number desc) from paged v), '[]'::jsonb)
  ) into result
  from public.saas_plans p where p.id = target_plan;

  if result is null then
    raise exception 'Plan not found' using errcode = 'P0002';
  end if;
  perform public.record_saas_privileged_operation(null, 'saas.plan_versions_read',
    'Consultar historial de versiones del plan', 'succeeded', jsonb_build_object(
      'plan_id', target_plan, 'page', page_number, 'page_size', page_size));
  return result;
end;
$$;

revoke all on function public.list_saas_plan_versions(uuid,integer,integer) from public, anon;
grant execute on function public.list_saas_plan_versions(uuid,integer,integer) to authenticated;

commit;
