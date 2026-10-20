alter table public.students
  add column gender text check (gender in ('female', 'male', 'other')),
  add column height_cm numeric(5, 2) check (height_cm > 0 and height_cm <= 300),
  add column weight_kg numeric(5, 2) check (weight_kg > 0 and weight_kg <= 500),
  add column emergency_contact_name text,
  add column emergency_contact_email text,
  add column emergency_contact_phone text;
