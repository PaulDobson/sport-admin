update public.students student
set emergency_contact_phone = (
  select contact.value
  from public.student_contacts contact
  where contact.tenant_id = student.tenant_id
    and contact.student_id = student.id
    and contact.type = 'emergency'
    and contact.status = 'active'
    and contact.is_primary
  order by contact.created_at desc
  limit 1
)
where student.emergency_contact_phone is null
  and exists (
    select 1
    from public.student_contacts contact
    where contact.tenant_id = student.tenant_id
      and contact.student_id = student.id
      and contact.type = 'emergency'
      and contact.status = 'active'
      and contact.is_primary
  );
