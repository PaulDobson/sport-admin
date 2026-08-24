alter table public.health_conditions add column version bigint not null default 1 check (version > 0);
alter table public.injuries add column version bigint not null default 1 check (version > 0);
alter table public.health_restrictions add column version bigint not null default 1 check (version > 0);
alter table public.class_session_attendance add column version bigint not null default 1 check (version > 0);

create or replace function public.increment_record_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.version = old.version + 1;
  return new;
end;
$$;

create trigger increment_health_conditions_version
  before update on public.health_conditions
  for each row execute function public.increment_record_version();
create trigger increment_injuries_version
  before update on public.injuries
  for each row execute function public.increment_record_version();
create trigger increment_health_restrictions_version
  before update on public.health_restrictions
  for each row execute function public.increment_record_version();
create trigger increment_attendance_version
  before update on public.class_session_attendance
  for each row execute function public.increment_record_version();