-- Invoker permissions and student RLS preserve academy and role isolation.
create or replace function public.search_attendance_students(
  target_tenant uuid,
  search_text text,
  page_number integer default 1
)
returns table (student_id uuid, student_name text, total_count bigint)
language plpgsql stable security invoker set search_path = public
as $$
declare
  query text := translate(lower(trim(search_text)), 'áéíóúüñ', 'aeiouun');
begin
  if length(query) < 2 or length(query) > 100 or page_number < 1 or page_number > 10000 then
    raise exception 'Introduce entre 2 y 100 caracteres y una página válida';
  end if;
  return query
  with candidates as (
    select s.id, s.full_name,
      translate(lower(s.full_name), 'áéíóúüñ', 'aeiouun') as normalized
    from public.students s
    where s.tenant_id = target_tenant and s.status = 'active'
  ), matches as (
    select * from candidates c
    where not exists (
      select 1 from regexp_split_to_table(query, '\s+') term
      where strpos(c.normalized, term) = 0
    )
  )
  select m.id, m.full_name, count(*) over ()
  from matches m
  order by
    (m.normalized = query) desc,
    (left(m.normalized, length(query)) = query) desc,
    exists (
      select 1 from regexp_split_to_table(m.normalized, '\s+') word
      where left(word, length(query)) = query
    ) desc,
    m.normalized, m.id
  limit 20 offset ((page_number - 1) * 20);
end;
$$;

revoke all on function public.search_attendance_students(uuid, text, integer) from public;
grant execute on function public.search_attendance_students(uuid, text, integer) to authenticated;
