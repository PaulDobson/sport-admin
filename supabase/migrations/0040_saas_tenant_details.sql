-- Extend the audited platform-admin listing without granting direct table access.
-- PostgreSQL requires recreation when a table-returning function gains columns.
drop function public.list_saas_tenants();
create function public.list_saas_tenants()
returns table (
  id uuid, name text, status text,
  billing_contact_name text, billing_contact_email text, created_at timestamptz,
  address text, contact_name text, contact_email text, phone text, city text, region text
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.record_saas_privileged_operation(
    null, 'saas.tenants_read', 'Tenant backoffice access', 'succeeded'
  );
  return query
    select t.id, t.name, t.status, t.billing_contact_name,
      t.billing_contact_email, t.created_at,
      d.address, d.contact_name, d.contact_email, d.phone, d.city, d.region
    from public.list_saas_tenants_unlogged() t
    left join public.tenant_details d on d.tenant_id = t.id
    order by t.created_at desc, t.id;
end;
$$;
revoke all on function public.list_saas_tenants() from public;
grant execute on function public.list_saas_tenants() to authenticated;
