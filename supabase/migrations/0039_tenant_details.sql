-- Main contact is independent of SaaS billing and operational locations.
create table public.tenant_details (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  address text check (length(address) <= 250),
  contact_name text check (length(contact_name) <= 120),
  contact_email text check (length(contact_email) <= 254),
  phone text check (length(phone) <= 30),
  city text check (length(city) <= 120),
  region text check (length(region) <= 120)
);

alter table public.tenant_details enable row level security;
create policy tenant_details_select on public.tenant_details for select to authenticated
  using (public.current_membership_role(tenant_id) in ('owner', 'admin'));
-- Mutations only through the atomic, audited RPC below.
revoke all on public.tenant_details from anon, authenticated;
grant select on public.tenant_details to authenticated;

create function public.get_tenant_details(target_tenant uuid)
returns table (
  tenant_id uuid, name text, address text, contact_name text,
  contact_email text, phone text, city text, region text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or coalesce(public.current_membership_role(target_tenant), '') not in ('owner', 'admin') then
    raise exception 'Tenant administrator access required' using errcode = '42501';
  end if;
  return query
    select t.id, t.name, d.address, d.contact_name, d.contact_email, d.phone, d.city, d.region
    from public.tenants t left join public.tenant_details d on d.tenant_id = t.id
    where t.id = target_tenant;
end;
$$;

create function public.update_tenant_details(
  target_tenant uuid, target_name text, target_address text,
  target_contact_name text, target_contact_email text,
  target_phone text, target_city text, target_region text
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  normalized_name text := btrim(target_name);
  normalized_address text := nullif(btrim(target_address), '');
  normalized_contact_name text := nullif(btrim(target_contact_name), '');
  normalized_contact_email text := nullif(btrim(target_contact_email), '');
  normalized_phone text := nullif(btrim(target_phone), '');
  normalized_city text := nullif(btrim(target_city), '');
  normalized_region text := nullif(btrim(target_region), '');
begin
  -- Lock the tenant so account suspension and profile updates cannot interleave.
  perform 1 from public.tenants where id = target_tenant for update;
  if auth.uid() is null or coalesce(public.current_membership_role(target_tenant), '') not in ('owner', 'admin') then
    raise exception 'Tenant administrator access required' using errcode = '42501';
  end if;
  if normalized_name is null or length(normalized_name) not between 1 and 160
    or length(normalized_address) > 250 or length(normalized_contact_name) > 120
    or length(normalized_contact_email) > 254 or length(normalized_phone) > 30
    or length(normalized_city) > 120 or length(normalized_region) > 120
    or (normalized_contact_email is not null and normalized_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (normalized_phone is not null and (
      normalized_phone !~ '^\+?[0-9 ()-]+$'
      or length(regexp_replace(normalized_phone, '[^0-9]', '', 'g')) < 7
    )) then
    raise exception 'Invalid gym details' using errcode = '22023';
  end if;

  update public.tenants set name = normalized_name where id = target_tenant;
  insert into public.tenant_details (tenant_id, address, contact_name, contact_email, phone, city, region)
    values (target_tenant, normalized_address, normalized_contact_name, normalized_contact_email, normalized_phone, normalized_city, normalized_region)
    on conflict (tenant_id) do update set
      address = excluded.address, contact_name = excluded.contact_name,
      contact_email = excluded.contact_email, phone = excluded.phone,
      city = excluded.city, region = excluded.region;
  insert into public.audit_log (tenant_id, actor_id, action, entity_type, entity_id)
    values (target_tenant, auth.uid(), 'tenant.details_updated', 'tenant', target_tenant::text);
end;
$$;

revoke all on function public.get_tenant_details(uuid) from public;
revoke all on function public.update_tenant_details(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.get_tenant_details(uuid) to authenticated;
grant execute on function public.update_tenant_details(uuid, text, text, text, text, text, text, text) to authenticated;
