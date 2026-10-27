-- Monthly aggregation of a student's attendance records.
-- Returns one row per calendar month, with counts per status.
-- This is used by the instructor dashboard to render an efficient
-- overview without loading hundreds of individual rows.
--
-- Security: security invoker — the caller must have SELECT permission on
-- class_session_attendance (enforced by the existing RLS policies that
-- require can_manage_session_enrollments for the tenant).

create or replace function public.get_student_attendance_monthly_summary(
  target_tenant_id  uuid,
  target_student_id uuid
)
returns table(
  yr       integer,
  mo       integer,
  present  bigint,
  late     bigint,
  absent   bigint,
  excused  bigint,
  total    bigint
)
language sql stable security invoker
set search_path = public, pg_temp
as $$
  select
    extract(year  from att.recorded_at)::integer as yr,
    extract(month from att.recorded_at)::integer as mo,
    count(*) filter (where att.status = 'present')  as present,
    count(*) filter (where att.status = 'late')     as late,
    count(*) filter (where att.status = 'absent')   as absent,
    count(*) filter (where att.status = 'excused')  as excused,
    count(*)                                         as total
  from public.class_session_attendance att
  where att.tenant_id  = target_tenant_id
    and att.student_id = target_student_id
  group by yr, mo
  order by yr desc, mo desc;
$$;

revoke all on function public.get_student_attendance_monthly_summary(uuid, uuid) from public;
grant execute on function public.get_student_attendance_monthly_summary(uuid, uuid) to authenticated;
