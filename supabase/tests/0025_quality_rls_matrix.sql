-- Run after migrations 0001-0026. Set two real auth user UUIDs below.
begin;

select set_config('test.owner_user', 'b262bdc0-d2fc-49e8-9b44-770f3a14bdac', true);
select set_config('test.assistant_user', '810363c9-4041-4ec2-a54a-1508d308e58d', true);

create or replace function pg_temp.expect_denied(statement text)
returns void
language plpgsql
as $$
declare
  affected_rows bigint;
begin
  begin
    execute statement;
    get diagnostics affected_rows = row_count;
    if affected_rows <> 0 then
      raise exception 'statement unexpectedly affected % rows: %', affected_rows, statement;
    end if;
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

create or replace function pg_temp.expect_zero_rows(statement text)
returns void
language plpgsql
as $$
declare
  affected_rows bigint;
begin
  execute statement;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 0 then
    raise exception 'cross-scope statement affected % rows: %', affected_rows, statement;
  end if;
end;
$$;

do $$
declare
  unprotected_tables text[];
begin
  select array_agg(distinct grant_row.table_name order by grant_row.table_name)
  into unprotected_tables
  from information_schema.role_table_grants grant_row
  join pg_class table_row on table_row.relname = grant_row.table_name
  join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
  where grant_row.table_schema = 'public'
    and grant_row.grantee in ('anon', 'authenticated')
    and schema_row.nspname = 'public'
    and table_row.relkind in ('r', 'p')
    and not table_row.relrowsecurity;

  if unprotected_tables is not null then
    raise exception 'exposed tables without RLS: %', unprotected_tables;
  end if;
end;
$$;

insert into public.tenants (id, name, status)
values
  ('27000000-0000-4000-8000-000000000001', 'Quality Tenant A', 'active'),
  ('27000000-0000-4000-8000-000000000002', 'Quality Tenant B', 'active');

insert into public.tenant_memberships (id, tenant_id, user_id, role, status)
values
  (
    '27000000-0000-4000-8000-000000000011',
    '27000000-0000-4000-8000-000000000001',
    current_setting('test.owner_user')::uuid,
    'owner',
    'active'
  ),
  (
    '27000000-0000-4000-8000-000000000012',
    '27000000-0000-4000-8000-000000000001',
    current_setting('test.assistant_user')::uuid,
    'assistant',
    'active'
  ),
  (
    '27000000-0000-4000-8000-000000000013',
    '27000000-0000-4000-8000-000000000002',
    current_setting('test.assistant_user')::uuid,
    'owner',
    'active'
  );

insert into public.notification_preferences (
  id, tenant_id, user_id, event_type, channel, enabled
)
values
  (
    '27000000-0000-4000-8000-000000000021',
    '27000000-0000-4000-8000-000000000001',
    current_setting('test.owner_user')::uuid,
    'attendance.absent',
    'email',
    true
  ),
  (
    '27000000-0000-4000-8000-000000000022',
    '27000000-0000-4000-8000-000000000001',
    current_setting('test.assistant_user')::uuid,
    'attendance.absent',
    'email',
    true
  ),
  (
    '27000000-0000-4000-8000-000000000023',
    '27000000-0000-4000-8000-000000000002',
    current_setting('test.assistant_user')::uuid,
    'attendance.absent',
    'email',
    true
  );

insert into public.activity_events (
  id, tenant_id, operation_id, event_type, severity, origin,
  entity_type, entity_id, title, message, occurred_at
)
values
  (
    '27000000-0000-4000-8000-000000000031',
    '27000000-0000-4000-8000-000000000001',
    '27000000-0000-4000-8000-000000000032',
    'attendance.absent', 'info', 'operations', 'attendance',
    '27000000-0000-4000-8000-000000000033',
    'Owner event', 'Visible only to owner recipient', now()
  ),
  (
    '27000000-0000-4000-8000-000000000034',
    '27000000-0000-4000-8000-000000000001',
    '27000000-0000-4000-8000-000000000035',
    'attendance.absent', 'info', 'operations', 'attendance',
    '27000000-0000-4000-8000-000000000036',
    'Assistant event', 'Visible only to assistant recipient', now()
  ),
  (
    '27000000-0000-4000-8000-000000000037',
    '27000000-0000-4000-8000-000000000002',
    '27000000-0000-4000-8000-000000000038',
    'attendance.absent', 'info', 'operations', 'attendance',
    '27000000-0000-4000-8000-000000000039',
    'Tenant B event', 'Visible only in tenant B', now()
  );

insert into public.activity_notifications (
  id, tenant_id, event_id, recipient_user_id, recipient_role
)
values
  (
    '27000000-0000-4000-8000-000000000041',
    '27000000-0000-4000-8000-000000000001',
    '27000000-0000-4000-8000-000000000031',
    current_setting('test.owner_user')::uuid,
    'owner'
  ),
  (
    '27000000-0000-4000-8000-000000000042',
    '27000000-0000-4000-8000-000000000001',
    '27000000-0000-4000-8000-000000000034',
    current_setting('test.assistant_user')::uuid,
    'assistant'
  ),
  (
    '27000000-0000-4000-8000-000000000043',
    '27000000-0000-4000-8000-000000000002',
    '27000000-0000-4000-8000-000000000037',
    current_setting('test.assistant_user')::uuid,
    'owner'
  );

insert into public.notification_deliveries (
  id, tenant_id, activity_notification_id, channel, status,
  attempt_count, max_attempts, delivered_at
)
values
  (
    '27000000-0000-4000-8000-000000000051',
    '27000000-0000-4000-8000-000000000001',
    '27000000-0000-4000-8000-000000000041',
    'email', 'delivered', 1, 3, now()
  ),
  (
    '27000000-0000-4000-8000-000000000052',
    '27000000-0000-4000-8000-000000000001',
    '27000000-0000-4000-8000-000000000042',
    'email', 'delivered', 1, 3, now()
  ),
  (
    '27000000-0000-4000-8000-000000000053',
    '27000000-0000-4000-8000-000000000002',
    '27000000-0000-4000-8000-000000000043',
    'email', 'delivered', 1, 3, now()
  );

insert into public.notification_delivery_attempts (
  id, tenant_id, delivery_id, attempt_number, status,
  provider_reference, attempted_at, completed_at
)
values
  (
    '27000000-0000-4000-8000-000000000061',
    '27000000-0000-4000-8000-000000000001',
    '27000000-0000-4000-8000-000000000051',
    1, 'delivered', 'owner-provider-reference', now(), now()
  ),
  (
    '27000000-0000-4000-8000-000000000062',
    '27000000-0000-4000-8000-000000000001',
    '27000000-0000-4000-8000-000000000052',
    1, 'delivered', 'assistant-provider-reference', now(), now()
  ),
  (
    '27000000-0000-4000-8000-000000000063',
    '27000000-0000-4000-8000-000000000002',
    '27000000-0000-4000-8000-000000000053',
    1, 'delivered', 'tenant-b-provider-reference', now(), now()
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner_user'), true);

do $$
begin
  if (select count(*) from public.notification_preferences) <> 1 then
    raise exception 'owner preference scope is incorrect';
  end if;
  if (select count(*) from public.activity_events) <> 1 then
    raise exception 'owner event scope exposed another recipient or tenant';
  end if;
  if (select count(*) from public.activity_notifications) <> 1 then
    raise exception 'owner activity center scope is incorrect';
  end if;
  if (select count(*) from public.notification_deliveries) <> 1 then
    raise exception 'owner delivery scope is incorrect';
  end if;
  if (select count(*) from public.notification_delivery_attempts) <> 1 then
    raise exception 'owner attempt scope is incorrect';
  end if;
end;
$$;

select pg_temp.expect_zero_rows(
  'update public.notification_preferences set enabled = false where id = ''27000000-0000-4000-8000-000000000022'''
);
select pg_temp.expect_zero_rows(
  'delete from public.notification_preferences where id = ''27000000-0000-4000-8000-000000000023'''
);
select pg_temp.expect_denied(
  format(
    'insert into public.notification_preferences (tenant_id, user_id, event_type, channel) values (''27000000-0000-4000-8000-000000000002'', %L, ''attendance.absent'', ''push'')',
    current_setting('test.owner_user')
  )
);
select pg_temp.expect_denied(
  'insert into public.activity_events (tenant_id, operation_id, event_type, severity, origin, entity_type, entity_id, title, message, occurred_at) values (''27000000-0000-4000-8000-000000000001'', gen_random_uuid(), ''attendance.absent'', ''info'', ''operations'', ''attendance'', gen_random_uuid(), ''Unauthorized'', ''Unauthorized'', now())'
);
select pg_temp.expect_denied(
  'delete from public.activity_notifications where id = ''27000000-0000-4000-8000-000000000041'''
);
select pg_temp.expect_denied(
  'update public.notification_deliveries set status = ''failed'' where id = ''27000000-0000-4000-8000-000000000051'''
);
select pg_temp.expect_denied(
  'delete from public.notification_delivery_attempts where id = ''27000000-0000-4000-8000-000000000061'''
);

select set_config('request.jwt.claim.sub', current_setting('test.assistant_user'), true);

do $$
begin
  if (select count(*) from public.notification_preferences) <> 2 then
    raise exception 'assistant multi-membership preference scope is incorrect';
  end if;
  if (select count(*) from public.activity_events) <> 2 then
    raise exception 'assistant recipient scope is incorrect';
  end if;
  if exists (
    select 1 from public.activity_events
    where id = '27000000-0000-4000-8000-000000000031'
  ) then
    raise exception 'assistant read owner-only event in the same tenant';
  end if;
  if (select count(*) from public.activity_notifications) <> 2 then
    raise exception 'assistant activity center scope is incorrect';
  end if;
  if (select count(*) from public.notification_deliveries) <> 2 then
    raise exception 'assistant delivery scope is incorrect';
  end if;
  if (select count(*) from public.notification_delivery_attempts) <> 2 then
    raise exception 'assistant attempt scope is incorrect';
  end if;
end;
$$;

reset role;
rollback;
