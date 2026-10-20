-- Opt-in deployment only, after SQL/staging verification. Never run as a migration.
-- Enable pg_cron/pg_net and create these secrets using the Supabase Vault UI:
-- sport_admin_site_url (HTTPS origin, no trailing slash),
-- sport_admin_renewal_worker_secret, sport_admin_document_worker_secret.
-- Worker secrets must match server-side environment values; never put them in cron commands.
begin;
do $$
declare site text;
begin
  if not exists(select 1 from pg_extension where extname = 'pg_cron')
    or not exists(select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'Enable pg_cron and pg_net before scheduling billing' using errcode = '55000';
  end if;
  select decrypted_secret into site from vault.decrypted_secrets where name = 'sport_admin_site_url';
  if site is null or site !~ '^https://[^/@?#[:space:]]+$'
    or not exists(select 1 from vault.decrypted_secrets where name = 'sport_admin_renewal_worker_secret' and length(decrypted_secret) >= 32)
    or not exists(select 1 from vault.decrypted_secrets where name = 'sport_admin_document_worker_secret' and length(decrypted_secret) >= 32) then
    raise exception 'Configure HTTPS origin and independent Vault worker secrets before scheduling' using errcode = '55000';
  end if;
  if (select decrypted_secret from vault.decrypted_secrets where name = 'sport_admin_renewal_worker_secret')
    = (select decrypted_secret from vault.decrypted_secrets where name = 'sport_admin_document_worker_secret') then
    raise exception 'Use independent worker secrets' using errcode = '22023';
  end if;
end;
$$;
select cron.schedule('sport-admin-saas-renewals','*/15 * * * *',$job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'sport_admin_site_url') || '/api/saas/renewals/process',
    headers := jsonb_build_object('Content-Type','application/json','Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sport_admin_renewal_worker_secret')),
    body := '{}'::jsonb,timeout_milliseconds := 180000);
$job$);
select cron.schedule('sport-admin-saas-documents','*/5 * * * *',$job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'sport_admin_site_url') || '/api/saas/documents/process',
    headers := jsonb_build_object('Content-Type','application/json','Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sport_admin_document_worker_secret')),
    body := '{}'::jsonb,timeout_milliseconds := 180000);
$job$);
commit;
