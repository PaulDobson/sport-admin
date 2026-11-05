-- Add logo_url to tenant_details so gyms can display their own logo.
-- Storage path convention: profile_instructor/{owner_user_id}/img_gym/logo.{ext}

alter table public.tenant_details
  add column if not exists logo_url text
    check (logo_url is null or length(logo_url) <= 500);

comment on column public.tenant_details.logo_url is
  'Public URL of the gym logo stored in the profile_instructor Storage bucket.';

-- ── get_tenant_details: añadir logo_url al resultado ─────────────────────────

drop function if exists public.get_tenant_details(uuid);

create function public.get_tenant_details(target_tenant uuid)
returns table (
  tenant_id uuid, name text, address text, contact_name text,
  contact_email text, phone text, city text, region text, logo_url text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or
     coalesce(public.current_membership_role(target_tenant), '') not in ('owner', 'admin')
  then
    raise exception 'Tenant administrator access required' using errcode = '42501';
  end if;
  return query
    select t.id, t.name,
           d.address, d.contact_name, d.contact_email,
           d.phone, d.city, d.region, d.logo_url
    from public.tenants t
    left join public.tenant_details d on d.tenant_id = t.id
    where t.id = target_tenant;
end;
$$;

revoke all on function public.get_tenant_details(uuid) from public;
grant execute on function public.get_tenant_details(uuid) to authenticated;

-- ── update_tenant_details: drop ambas firmas posibles, recrear con logo_url ──

drop function if exists public.update_tenant_details(uuid, text, text, text, text, text, text, text);
drop function if exists public.update_tenant_details(uuid, text, text, text, text, text, text, text, text);

create function public.update_tenant_details(
  target_tenant        uuid,
  target_name          text,
  target_address       text,
  target_contact_name  text,
  target_contact_email text,
  target_phone         text,
  target_city          text,
  target_region        text,
  target_logo_url      text default null
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  normalized_name          text := btrim(target_name);
  normalized_address       text := nullif(btrim(target_address), '');
  normalized_contact_name  text := nullif(btrim(target_contact_name), '');
  normalized_contact_email text := nullif(btrim(target_contact_email), '');
  normalized_phone         text := nullif(btrim(target_phone), '');
  normalized_city          text := nullif(btrim(target_city), '');
  normalized_region        text := nullif(btrim(target_region), '');
  normalized_logo_url      text := nullif(btrim(coalesce(target_logo_url, '')), '');
begin
  perform 1 from public.tenants where id = target_tenant for update;

  if auth.uid() is null or
     coalesce(public.current_membership_role(target_tenant), '') not in ('owner', 'admin')
  then
    raise exception 'Tenant administrator access required' using errcode = '42501';
  end if;

  if normalized_name is null or length(normalized_name) not between 1 and 160
    or length(normalized_address)       > 250
    or length(normalized_contact_name)  > 120
    or length(normalized_contact_email) > 254
    or length(normalized_phone)         > 30
    or length(normalized_city)          > 120
    or length(normalized_region)        > 120
    or (normalized_contact_email is not null
        and normalized_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (normalized_phone is not null and (
          normalized_phone !~ '^\+?[0-9 ()-]+$'
          or length(regexp_replace(normalized_phone, '[^0-9]', '', 'g')) < 7))
    or (normalized_logo_url is not null and length(normalized_logo_url) > 500)
  then
    raise exception 'Invalid gym details' using errcode = '22023';
  end if;

  update public.tenants set name = normalized_name where id = target_tenant;

  insert into public.tenant_details
    (tenant_id, address, contact_name, contact_email, phone, city, region, logo_url)
  values
    (target_tenant, normalized_address, normalized_contact_name,
     normalized_contact_email, normalized_phone,
     normalized_city, normalized_region, normalized_logo_url)
  on conflict (tenant_id) do update set
    address       = excluded.address,
    contact_name  = excluded.contact_name,
    contact_email = excluded.contact_email,
    phone         = excluded.phone,
    city          = excluded.city,
    region        = excluded.region,
    -- Preservar logo existente si no se pasa uno nuevo
    logo_url      = coalesce(excluded.logo_url, public.tenant_details.logo_url);

  insert into public.audit_log
    (tenant_id, actor_id, action, entity_type, entity_id)
  values
    (target_tenant, auth.uid(),
     'tenant.details_updated', 'tenant', target_tenant::text);
end;
$$;

revoke all on function public.update_tenant_details(uuid,text,text,text,text,text,text,text,text) from public;
grant execute on function public.update_tenant_details(uuid,text,text,text,text,text,text,text,text) to authenticated;

-- ── list_saas_tenants: añadir logo_url al backoffice ─────────────────────────

drop function if exists public.list_saas_tenants();

create function public.list_saas_tenants()
returns table (
  id uuid, name text, status text,
  billing_contact_name text, billing_contact_email text, created_at timestamptz,
  address text, contact_name text, contact_email text,
  phone text, city text, region text, logo_url text
)
language plpgsql security definer set search_path = public
as $$
begin
  perform public.record_saas_privileged_operation(
    null, 'saas.tenants_read', 'Tenant backoffice access', 'succeeded'
  );
  return query
    select t.id, t.name, t.status,
           t.billing_contact_name, t.billing_contact_email, t.created_at,
           d.address, d.contact_name, d.contact_email,
           d.phone, d.city, d.region, d.logo_url
    from public.list_saas_tenants_unlogged() t
    left join public.tenant_details d on d.tenant_id = t.id
    order by t.created_at desc, t.id;
end;
$$;

revoke all on function public.list_saas_tenants() from public;
grant execute on function public.list_saas_tenants() to authenticated;
