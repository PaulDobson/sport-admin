-- Run after migrations 0001-0028.
-- Verifies the CLP default without converting explicitly denominated records.
begin;

set local role postgres;

insert into public.tenants (id, name, status)
values ('c2800000-0000-4000-8000-000000000001', 'CLP Default Tenant', 'active');

insert into public.membership_plans (id, tenant_id, name, price, duration_days)
values
  ('c2800000-0000-4000-8000-000000000011', 'c2800000-0000-4000-8000-000000000001', 'Local Plan', 30000, 30),
  ('c2800000-0000-4000-8000-000000000012', 'c2800000-0000-4000-8000-000000000001', 'Legacy USD Plan', 49, 30);

update public.membership_plans
set currency = 'USD'
where id = 'c2800000-0000-4000-8000-000000000012';

do $$
begin
  if (select currency from public.membership_plans where id = 'c2800000-0000-4000-8000-000000000011') <> 'CLP' then
    raise exception 'new membership plans must default to CLP';
  end if;
  if (select currency from public.membership_plans where id = 'c2800000-0000-4000-8000-000000000012') <> 'USD' then
    raise exception 'explicit historical currency must remain unchanged';
  end if;
  if (select price from public.membership_plans where id = 'c2800000-0000-4000-8000-000000000012') <> 49 then
    raise exception 'historical price must remain unchanged';
  end if;
end;
$$;

rollback;
