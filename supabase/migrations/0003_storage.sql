-- Private bucket for trip paperwork. No public URLs, ever.
-- Files live at <trip_id>/<uuid>-<filename>, so the first path segment is the trip id
-- and ownership can be checked straight off the path.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-documents',
  'trip-documents',
  false,
  26214400, -- 25 MB per file; a boarding pass PDF is ~250 KB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/webp',
    'application/vnd.apple.pkpass'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The owner of the trip named by the first path segment may do anything with the file.
drop policy if exists trip_documents_owner_select on storage.objects;
create policy trip_documents_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'trip-documents'
    and public.owns_trip(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists trip_documents_owner_insert on storage.objects;
create policy trip_documents_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trip-documents'
    and public.owns_trip(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists trip_documents_owner_update on storage.objects;
create policy trip_documents_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'trip-documents'
    and public.owns_trip(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists trip_documents_owner_delete on storage.objects;
create policy trip_documents_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'trip-documents'
    and public.owns_trip(((storage.foldername(name))[1])::uuid)
  );
