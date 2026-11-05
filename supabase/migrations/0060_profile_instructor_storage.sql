-- Storage bucket for instructor/owner profile images.
-- Path conventions:
--   Profile avatar : profile_instructor/{user_id}/img_profile/avatar.{ext}
--   Gym logo       : profile_instructor/{user_id}/img_gym/logo.{ext}
--
-- Each sub-folder keeps exactly one file; upsert replaces on re-upload.
-- The bucket is public so URLs are readable without auth tokens.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile_instructor',
  'profile_instructor',
  true,
  5242880,   -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Drop old policies so we can recreate them cleanly ────────────────────────

drop policy if exists "profile_instructor: authenticated can read"  on storage.objects;
drop policy if exists "profile_instructor: owner can upload"        on storage.objects;
drop policy if exists "profile_instructor: owner can update"        on storage.objects;
drop policy if exists "profile_instructor: owner can delete"        on storage.objects;

-- ── RLS policies ─────────────────────────────────────────────────────────────

-- Any authenticated user can read objects in this public bucket.
create policy "profile_instructor: authenticated can read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'profile_instructor');

-- A user may INSERT objects only inside their own sub-folder AND into one of
-- the two recognised sub-directories (img_profile or img_gym).
create policy "profile_instructor: owner can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile_instructor'
    and (storage.foldername(name))[1] = (auth.uid())::text
    and (storage.foldername(name))[2] in ('img_profile', 'img_gym')
  );

-- A user may UPDATE (replace) objects only inside their own sub-folder.
create policy "profile_instructor: owner can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile_instructor'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- A user may DELETE objects only inside their own sub-folder.
create policy "profile_instructor: owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile_instructor'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
