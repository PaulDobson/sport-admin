-- Security hardening: users without an operational tenant membership must be denied.
-- Run after 0019_saas_privileged_audit.sql.

create or replace function public.can_access_student_health(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(
    public.current_membership_role(target_tenant)
      in ('owner', 'admin', 'instructor'),
    false
  );
$$;

create or replace function public.can_review_sensitive_audit(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(
    public.current_membership_role(target_tenant) in ('owner', 'admin'),
    false
  );
$$;

revoke all on function public.can_access_student_health(uuid) from public;
revoke all on function public.can_review_sensitive_audit(uuid) from public;
grant execute on function public.can_access_student_health(uuid) to authenticated;
grant execute on function public.can_review_sensitive_audit(uuid) to authenticated;