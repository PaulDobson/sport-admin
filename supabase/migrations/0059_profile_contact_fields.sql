-- Add contact fields to profiles so instructors/owners can store
-- a phone number alongside their name. Email is not duplicated here;
-- it is always read from auth.users via the get_my_profile RPC.

alter table public.profiles
  add column if not exists phone text
    check (phone is null or (char_length(trim(phone)) between 7 and 30));

-- Optional: index for future lookups by phone (e.g. support tooling).
create index if not exists profiles_phone_idx on public.profiles (phone)
  where phone is not null;

comment on column public.profiles.phone is
  'Instructor/owner contact phone number. Format: international or local, 7–30 chars.';

-- RPC: return the calling user's own profile including their auth email.
-- Using SECURITY DEFINER so the function can read auth.users without
-- exposing that table to the authenticated role.
create or replace function public.get_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id',         p.id,
    'full_name',  p.full_name,
    'avatar_url', p.avatar_url,
    'phone',      p.phone,
    'email',      u.email
  )
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;
