-- Deterministic local-only identities used by transactional SQL matrices.
insert into auth.users (id)
values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('b262bdc0-d2fc-49e8-9b44-770f3a14bdac'),
  ('810363c9-4041-4ec2-a54a-1508d308e58d')
on conflict (id) do nothing;