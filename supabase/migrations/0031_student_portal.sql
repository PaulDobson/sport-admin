create table if not exists public.student_portal_accounts (
  tenant_id uuid not null,
  student_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by_membership_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, student_id, user_id),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete cascade,
  foreign key (tenant_id, invited_by_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete restrict
);

create index if not exists student_portal_accounts_user_idx
  on public.student_portal_accounts(user_id, tenant_id);

create table if not exists public.student_portal_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  student_id uuid not null,
  invited_email text not null,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_by_membership_id uuid not null,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete cascade,
  foreign key (tenant_id, created_by_membership_id)
    references public.tenant_memberships(tenant_id, id) on delete restrict,
  check ((redeemed_at is null) = (redeemed_by is null))
);

create index if not exists student_portal_invitations_student_idx
  on public.student_portal_invitations(tenant_id, student_id, created_at desc);

alter table public.student_portal_accounts enable row level security;
alter table public.student_portal_invitations enable row level security;

create policy student_portal_accounts_select_own
  on public.student_portal_accounts for select
  using (user_id = auth.uid());

create or replace function public.is_student_portal_linked(
  target_tenant_id uuid,
  target_student_id uuid
)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.student_portal_accounts account
    join public.students student
      on student.tenant_id = account.tenant_id
     and student.id = account.student_id
     and student.status = 'active'
    join public.tenants tenant
      on tenant.id = account.tenant_id
     and tenant.status in ('trial', 'active')
    where account.tenant_id = target_tenant_id
      and account.student_id = target_student_id
      and account.user_id = auth.uid()
  );
$$;

revoke all on function public.is_student_portal_linked(uuid, uuid) from public;
grant execute on function public.is_student_portal_linked(uuid, uuid) to authenticated;

create or replace function public.create_student_portal_invitation(
  target_tenant_id uuid,
  target_student_id uuid,
  target_token_hash text,
  target_expires_at timestamptz
)
returns table(invited_email text, tenant_name text, expires_at timestamptz)
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  contact_email text;
  issuer_membership uuid;
begin
  if auth.uid() is null
    or not public.can_manage_student_records(target_tenant_id) then
    raise exception 'not authorized to invite this student' using errcode = '42501';
  end if;
  if target_token_hash !~ '^[a-f0-9]{64}$'
    or target_expires_at <= now()
    or target_expires_at > now() + interval '7 days' then
    raise exception 'invalid student portal invitation' using errcode = '22023';
  end if;

  select lower(trim(contact.value)) into contact_email
  from public.student_contacts contact
  join public.students student
    on student.tenant_id = contact.tenant_id
   and student.id = contact.student_id
  where contact.tenant_id = target_tenant_id
    and contact.student_id = target_student_id
    and contact.type = 'email'
    and contact.is_primary
    and contact.status = 'active'
    and student.status = 'active'
  limit 1;
  if contact_email is null then
    raise exception 'student has no active primary email' using errcode = 'P0002';
  end if;

  select public.current_membership_id(target_tenant_id)
    into issuer_membership;

  update public.student_portal_invitations invitation
  set revoked_at = now()
  where invitation.tenant_id = target_tenant_id
    and invitation.student_id = target_student_id
    and invitation.redeemed_at is null
    and invitation.revoked_at is null;

  insert into public.student_portal_invitations (
    tenant_id,
    student_id,
    invited_email,
    token_hash,
    created_by_membership_id,
    expires_at
  ) values (
    target_tenant_id,
    target_student_id,
    contact_email,
    target_token_hash,
    issuer_membership,
    target_expires_at
  );

  return query
    select contact_email, tenant.name, target_expires_at
    from public.tenants tenant
    where tenant.id = target_tenant_id;
end;
$$;

create or replace function public.lookup_student_portal_invitation(
  target_token_hash text
)
returns table(invited_email text, tenant_name text, expires_at timestamptz)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select invitation.invited_email, tenant.name, invitation.expires_at
  from public.student_portal_invitations invitation
  join public.students student
    on student.tenant_id = invitation.tenant_id
   and student.id = invitation.student_id
   and student.status = 'active'
  join public.tenants tenant
    on tenant.id = invitation.tenant_id
   and tenant.status in ('trial', 'active')
  where invitation.token_hash = target_token_hash
    and invitation.expires_at > now()
    and invitation.redeemed_at is null
    and invitation.revoked_at is null
    and target_token_hash ~ '^[a-f0-9]{64}$';
$$;

create or replace function public.has_pending_student_portal_invitation()
returns boolean
language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from auth.users user_row
    join public.student_portal_invitations invitation
      on lower(user_row.email) = invitation.invited_email
    join public.students student
      on student.tenant_id = invitation.tenant_id
     and student.id = invitation.student_id
     and student.status = 'active'
    join public.tenants tenant
      on tenant.id = invitation.tenant_id
     and tenant.status in ('trial', 'active')
    where user_row.id = auth.uid()
      and user_row.email_confirmed_at is not null
      and invitation.expires_at > now()
      and invitation.redeemed_at is null
      and invitation.revoked_at is null
  );
$$;

create or replace function public.redeem_student_portal_invitation(
  target_token_hash text
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  invitation public.student_portal_invitations;
  account_email text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select lower(user_row.email) into account_email
  from auth.users user_row
  where user_row.id = auth.uid()
    and user_row.email_confirmed_at is not null;
  if account_email is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;

  select * into invitation
  from public.student_portal_invitations candidate
  where candidate.token_hash = target_token_hash
    and candidate.expires_at > now()
    and candidate.redeemed_at is null
    and candidate.revoked_at is null
  for update;
  if not found or invitation.invited_email <> account_email then
    raise exception 'invitation is invalid or does not match this email'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.students student
    join public.tenants tenant
      on tenant.id = student.tenant_id
     and tenant.status in ('trial', 'active')
    join public.student_contacts contact
      on contact.tenant_id = student.tenant_id
     and contact.student_id = student.id
     and contact.type = 'email'
     and contact.is_primary
     and contact.status = 'active'
     and lower(trim(contact.value)) = invitation.invited_email
    where student.tenant_id = invitation.tenant_id
      and student.id = invitation.student_id
      and student.status = 'active'
  ) then
    raise exception 'student invitation is no longer current' using errcode = '42501';
  end if;

  insert into public.student_portal_accounts (
    tenant_id,
    student_id,
    user_id,
    invited_by_membership_id
  ) values (
    invitation.tenant_id,
    invitation.student_id,
    auth.uid(),
    invitation.created_by_membership_id
  ) on conflict (tenant_id, student_id, user_id) do nothing;

  update public.student_portal_invitations
  set redeemed_at = now(), redeemed_by = auth.uid()
  where id = invitation.id;
end;
$$;

create or replace function public.list_my_student_portal_students()
returns table(student_id uuid, tenant_id uuid, full_name text, tenant_name text)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select student.id, student.tenant_id, student.full_name, tenant.name
  from public.student_portal_accounts account
  join public.students student
    on student.tenant_id = account.tenant_id
   and student.id = account.student_id
   and student.status = 'active'
  join public.tenants tenant
    on tenant.id = account.tenant_id
   and tenant.status in ('trial', 'active')
  where account.user_id = auth.uid()
  order by student.full_name;
$$;

create or replace function public.list_my_student_portal_sessions(
  target_student_id uuid
)
returns table(
  session_id uuid,
  tenant_id uuid,
  student_id uuid,
  class_name text,
  location_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  capacity integer,
  confirmed_count integer,
  waitlisted_count integer,
  enrollment_status text,
  waitlist_enabled boolean
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.student_portal_accounts account
    join public.students student
      on student.tenant_id = account.tenant_id
     and student.id = account.student_id
     and student.status = 'active'
    where account.student_id = target_student_id
      and account.user_id = auth.uid()
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
      session.capacity,
      (select count(*)::integer from public.session_enrollments enrollment
       where enrollment.tenant_id = session.tenant_id
         and enrollment.session_id = session.id
         and enrollment.status = 'confirmed'),
      (select count(*)::integer from public.session_enrollments enrollment
       where enrollment.tenant_id = session.tenant_id
         and enrollment.session_id = session.id
         and enrollment.status = 'waitlisted'),
      (select enrollment.status from public.session_enrollments enrollment
       where enrollment.tenant_id = session.tenant_id
         and enrollment.session_id = session.id
         and enrollment.student_id = target_student_id
         and enrollment.status <> 'cancelled'),
      session.waitlist_enabled
    from public.class_sessions session
    join public.class_templates template
      on template.tenant_id = session.tenant_id
     and template.id = session.class_template_id
    join public.locations location
      on location.tenant_id = session.tenant_id
     and location.id = session.location_id
    join public.student_portal_accounts account
      on account.tenant_id = session.tenant_id
     and account.student_id = target_student_id
     and account.user_id = auth.uid()
    join public.tenants tenant
      on tenant.id = account.tenant_id
     and tenant.status in ('trial', 'active')
    where session.tenant_id = account.tenant_id
      and session.status = 'scheduled'
      and session.ends_at > now()
    order by session.starts_at
    limit 100;
end;
$$;

create or replace function public.enroll_student_in_session(
  target_tenant_id uuid,
  target_session_id uuid,
  target_student_id uuid
)
returns public.session_enrollments
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  target_session public.class_sessions;
  confirmed_count integer;
  enrollment_status text;
  result public.session_enrollments;
begin
  if not public.can_manage_session_enrollments(target_tenant_id, target_session_id)
    and not public.is_student_portal_linked(target_tenant_id, target_student_id) then
    raise exception 'not authorized to enroll this student' using errcode = '42501';
  end if;

  select * into target_session
  from public.class_sessions
  where tenant_id = target_tenant_id and id = target_session_id
  for update;

  if not found or target_session.status <> 'scheduled'
    or target_session.ends_at <= now() then
    raise exception 'session is not open for enrollment' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.students
    where tenant_id = target_tenant_id
      and id = target_student_id
      and status = 'active'
  ) then
    raise exception 'active student not found' using errcode = 'P0002';
  end if;

  select count(*) into confirmed_count
  from public.session_enrollments
  where tenant_id = target_tenant_id
    and session_id = target_session_id
    and status = 'confirmed';

  if confirmed_count >= target_session.capacity
    and not target_session.waitlist_enabled then
    raise exception 'session capacity is full' using errcode = '23514';
  end if;
  enrollment_status := case
    when confirmed_count < target_session.capacity then 'confirmed'
    else 'waitlisted'
  end;

  insert into public.session_enrollments (tenant_id, session_id, student_id, status)
  values (target_tenant_id, target_session_id, target_student_id, enrollment_status)
  on conflict (tenant_id, session_id, student_id) do update
    set status = case
      when session_enrollments.status = 'cancelled' then excluded.status
      else session_enrollments.status
    end
  returning * into result;
  return result;
end;
$$;

create or replace function public.cancel_session_enrollment(
  target_tenant_id uuid,
  target_session_id uuid,
  target_student_id uuid
)
returns public.session_enrollments
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  result public.session_enrollments;
  previous_status text;
  staff_authorized boolean;
begin
  staff_authorized := public.can_manage_session_enrollments(
    target_tenant_id,
    target_session_id
  );
  if not staff_authorized
    and not public.is_student_portal_linked(target_tenant_id, target_student_id) then
    raise exception 'not authorized to cancel this enrollment' using errcode = '42501';
  end if;

  if not staff_authorized and not exists (
    select 1
    from public.class_sessions session
    where session.tenant_id = target_tenant_id
      and session.id = target_session_id
      and session.status = 'scheduled'
      and session.ends_at > now()
  ) then
    raise exception 'only future scheduled sessions can be cancelled'
      using errcode = '42501';
  end if;

  select status into previous_status
  from public.session_enrollments
  where tenant_id = target_tenant_id
    and session_id = target_session_id
    and student_id = target_student_id
    and status <> 'cancelled'
  for update;
  if not found then
    raise exception 'active session enrollment not found' using errcode = 'P0002';
  end if;

  update public.session_enrollments
  set status = 'cancelled'
  where tenant_id = target_tenant_id
    and session_id = target_session_id
    and student_id = target_student_id
    and status <> 'cancelled'
  returning * into result;

  if previous_status = 'confirmed' then
    update public.session_enrollments
    set status = 'confirmed'
    where id = (
      select id
      from public.session_enrollments
      where tenant_id = target_tenant_id
        and session_id = target_session_id
        and status = 'waitlisted'
      order by created_at, id
      limit 1
      for update skip locked
    );
  end if;
  return result;
end;
$$;

revoke all on function public.create_student_portal_invitation(uuid, uuid, text, timestamptz) from public;
revoke all on function public.lookup_student_portal_invitation(text) from public;
revoke all on function public.has_pending_student_portal_invitation() from public;
revoke all on function public.redeem_student_portal_invitation(text) from public;
revoke all on function public.list_my_student_portal_students() from public;
revoke all on function public.list_my_student_portal_sessions(uuid) from public;
revoke all on function public.enroll_student_in_session(uuid, uuid, uuid) from public;
revoke all on function public.cancel_session_enrollment(uuid, uuid, uuid) from public;
grant execute on function public.create_student_portal_invitation(uuid, uuid, text, timestamptz) to authenticated;
grant execute on function public.lookup_student_portal_invitation(text) to anon, authenticated;
grant execute on function public.has_pending_student_portal_invitation() to authenticated;
grant execute on function public.redeem_student_portal_invitation(text) to authenticated;
grant execute on function public.list_my_student_portal_students() to authenticated;
grant execute on function public.list_my_student_portal_sessions(uuid) to authenticated;
grant execute on function public.enroll_student_in_session(uuid, uuid, uuid) to authenticated;
grant execute on function public.cancel_session_enrollment(uuid, uuid, uuid) to authenticated;
