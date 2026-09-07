create extension if not exists pgcrypto;

-- Deterministic local-only identities used by transactional SQL matrices.
insert into auth.users (id)
values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('b262bdc0-d2fc-49e8-9b44-770f3a14bdac'),
  ('810363c9-4041-4ec2-a54a-1508d308e58d')
on conflict (id) do nothing;

-- Demo credentials for local role testing:
-- owner@sport-admin.test / SportAdmin123!
-- admin@sport-admin.test / SportAdmin123!
-- instructor@sport-admin.test / SportAdmin123!
-- assistant@sport-admin.test / SportAdmin123!
-- platform-admin@sport-admin.test / SportAdmin123!
with demo_users (id, email, full_name) as (
  values
    ('90000000-0000-4000-8000-000000000001'::uuid, 'owner@sport-admin.test', 'Olivia Owner'),
    ('90000000-0000-4000-8000-000000000002'::uuid, 'admin@sport-admin.test', 'Amelia Admin'),
    ('90000000-0000-4000-8000-000000000003'::uuid, 'instructor@sport-admin.test', 'Ivan Instructor'),
    ('90000000-0000-4000-8000-000000000004'::uuid, 'assistant@sport-admin.test', 'Ana Assistant'),
    ('90000000-0000-4000-8000-000000000005'::uuid, 'platform-admin@sport-admin.test', 'Pat Platform Admin')
)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  email_change_confirm_status,
  reauthentication_token,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  demo_users.id,
  'authenticated',
  'authenticated',
  demo_users.email,
  crypt('SportAdmin123!', gen_salt('bf')),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', demo_users.full_name),
  '',
  '',
  '',
  '',
  '',
  0,
  '',
  false,
  false,
  now(),
  now()
from demo_users
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  last_sign_in_at = excluded.last_sign_in_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change = excluded.email_change,
  email_change_token_new = excluded.email_change_token_new,
  email_change_token_current = excluded.email_change_token_current,
  email_change_confirm_status = excluded.email_change_confirm_status,
  reauthentication_token = excluded.reauthentication_token,
  is_sso_user = excluded.is_sso_user,
  is_anonymous = excluded.is_anonymous,
  updated_at = excluded.updated_at;

with demo_users (id, email, full_name) as (
  values
    ('90000000-0000-4000-8000-000000000001'::uuid, 'owner@sport-admin.test', 'Olivia Owner'),
    ('90000000-0000-4000-8000-000000000002'::uuid, 'admin@sport-admin.test', 'Amelia Admin'),
    ('90000000-0000-4000-8000-000000000003'::uuid, 'instructor@sport-admin.test', 'Ivan Instructor'),
    ('90000000-0000-4000-8000-000000000004'::uuid, 'assistant@sport-admin.test', 'Ana Assistant'),
    ('90000000-0000-4000-8000-000000000005'::uuid, 'platform-admin@sport-admin.test', 'Pat Platform Admin')
)
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  demo_users.id,
  demo_users.id,
  demo_users.id::text,
  jsonb_build_object(
    'sub', demo_users.id::text,
    'email', demo_users.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from demo_users
on conflict (provider, provider_id) do update set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  last_sign_in_at = excluded.last_sign_in_at,
  updated_at = excluded.updated_at;

insert into public.profiles (id, full_name)
values
  ('90000000-0000-4000-8000-000000000001', 'Olivia Owner'),
  ('90000000-0000-4000-8000-000000000002', 'Amelia Admin'),
  ('90000000-0000-4000-8000-000000000003', 'Ivan Instructor'),
  ('90000000-0000-4000-8000-000000000004', 'Ana Assistant'),
  ('90000000-0000-4000-8000-000000000005', 'Pat Platform Admin')
on conflict (id) do update set
  full_name = excluded.full_name;

insert into public.tenants (id, name, status, created_by)
values (
  '91000000-0000-4000-8000-000000000001',
  'Sport Admin Demo Academy',
  'active',
  '90000000-0000-4000-8000-000000000001'
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  created_by = excluded.created_by;

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  (
    '92000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    'owner',
    'active'
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    '91000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000002',
    'admin',
    'active'
  ),
  (
    '92000000-0000-4000-8000-000000000003',
    '91000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000003',
    'instructor',
    'active'
  ),
  (
    '92000000-0000-4000-8000-000000000004',
    '91000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000004',
    'assistant',
    'active'
  )
on conflict (tenant_id, user_id) do update set
  role = excluded.role,
  status = excluded.status;

insert into public.assistant_instructor_assignments (
  id,
  tenant_id,
  assistant_membership_id,
  instructor_membership_id,
  status
)
values (
  '93000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000004',
  '92000000-0000-4000-8000-000000000003',
  'active'
)
on conflict (tenant_id, assistant_membership_id, instructor_membership_id) do update set
  status = excluded.status;

insert into public.platform_admins (id)
values ('90000000-0000-4000-8000-000000000005')
on conflict (id) do nothing;
