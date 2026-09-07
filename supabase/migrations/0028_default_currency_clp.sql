-- Default CLP for new financial records; existing amounts and currencies remain unchanged.

alter table public.membership_plans
  alter column currency set default 'CLP';

alter table public.saas_plans
  alter column currency set default 'CLP';