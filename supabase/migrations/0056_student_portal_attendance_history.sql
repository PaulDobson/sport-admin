-- Student portal: expose attendance history so students can see classes they
-- attended, were late to, or missed, together with the session details.
--
-- A row is returned when EITHER of these is true:
--   1. The student has a session_enrollment (confirmed or waitlisted) AND the
--      session has already ended — covers booked students regardless of whether
--      staff recorded attendance.
--   2. The student has a class_session_attendance record for that session —
--      covers walk-ins added directly by the instructor without a prior booking.
--
-- Security: security definer + explicit student_portal_accounts check ensures
-- a student can only read their own records from their own tenant.

create or replace function public.list_my_student_portal_attendance(
  target_student_id uuid
)
returns table(
  session_id        uuid,
  tenant_id         uuid,
  student_id        uuid,
  class_name        text,
  location_name     text,
  starts_at         timestamptz,
  ends_at           timestamptz,
  timezone          text,
  attendance_status text   -- 'present' | 'late' | 'absent' | 'excused' | null
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  -- Verify the calling user owns this student record.
  if not exists (
    select 1
    from public.student_portal_accounts account
    join public.students student
      on student.tenant_id = account.tenant_id
     and student.id        = account.student_id
     and student.status    = 'active'
    where account.student_id = target_student_id
      and account.user_id    = auth.uid()
  ) then
    raise exception 'student portal access denied' using errcode = '42501';
  end if;

  return query
    select
      session.id,
      session.tenant_id,
      target_student_id,
      template.name,
      location.name,
      session.starts_at,
      session.ends_at,
      session.timezone,
      -- Most recent attendance record logged by staff; NULL if not recorded yet.
      (
        select att.status
        from public.class_session_attendance att
        where att.tenant_id  = session.tenant_id
          and att.session_id = session.id
          and att.student_id = target_student_id
        order by att.recorded_at desc
        limit 1
      ) as attendance_status
    from public.class_sessions session
    join public.class_templates template
      on template.tenant_id = session.tenant_id
     and template.id        = session.class_template_id
    join public.locations location
      on location.tenant_id = session.tenant_id
     and location.id        = session.location_id
    -- Scope to the tenant the student belongs to.
    join public.student_portal_accounts account
      on account.tenant_id   = session.tenant_id
     and account.student_id  = target_student_id
     and account.user_id     = auth.uid()
    join public.tenants tenant
      on tenant.id     = account.tenant_id
     and tenant.status in ('trial', 'active')
    -- Case 1: student had a booking (LEFT JOIN so case 2 still matches)
    left join public.session_enrollments enrollment
      on enrollment.tenant_id  = session.tenant_id
     and enrollment.session_id = session.id
     and enrollment.student_id = target_student_id
     and enrollment.status in ('confirmed', 'waitlisted')
    -- Case 2: instructor added student to the attendance sheet directly
    left join public.class_session_attendance walk_in
      on walk_in.tenant_id  = session.tenant_id
     and walk_in.session_id = session.id
     and walk_in.student_id = target_student_id
    where session.tenant_id = account.tenant_id
      -- Only past sessions.
      and session.ends_at < now()
      -- Must have at least one of: a booking OR a direct attendance record.
      and (enrollment.id is not null or walk_in.id is not null)
    order by session.starts_at desc
    limit 200;
end;
$$;

revoke all on function public.list_my_student_portal_attendance(uuid) from public;
grant execute on function public.list_my_student_portal_attendance(uuid) to authenticated;
