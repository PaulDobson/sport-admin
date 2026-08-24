-- Stage 2: let a tenant creator read the account row while claiming the first
-- owner membership. Operational data remains gated by current_tenant_ids().

drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants for select
  using (
    id = any (public.current_tenant_ids())
    or created_by = auth.uid()
  );