-- =============================================================================
-- Org-scoped storage for material images
-- =============================================================================
-- Material images were filed under the uploader's user id, and the bucket
-- policies required the first path segment to equal auth.uid(). The materials
-- catalog itself is org-shared, so a teammate could read a material row and then
-- fail to load its image. File new uploads under the organization id instead.
--
-- The legacy user-id folder stays permitted so images already uploaded remain
-- reachable.
-- =============================================================================

/**
 * True when the first segment of a storage object's path is an organization the
 * caller belongs to, or the caller's own user id (legacy layout).
 *
 * plpgsql with a nested exception block because the segment is not guaranteed to
 * be a uuid, and a bare cast inside a policy would raise instead of returning
 * false.
 */
create or replace function public.storage_path_in_user_scope(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  first_segment text := (storage.foldername(object_name))[1];
  candidate uuid;
begin
  if first_segment is null then
    return false;
  end if;

  begin
    candidate := first_segment::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  if candidate = auth.uid() then
    return true;
  end if;

  return candidate in (select public.user_org_ids());
end;
$$;

drop policy if exists "Allow authenticated users to upload materials" on storage.objects;
drop policy if exists "Allow authenticated users to read their materials" on storage.objects;
drop policy if exists "Allow authenticated users to update their materials" on storage.objects;
drop policy if exists "Allow authenticated users to delete their materials" on storage.objects;

drop policy if exists "org members upload material images" on storage.objects;
drop policy if exists "org members read material images" on storage.objects;
drop policy if exists "org members update material images" on storage.objects;
drop policy if exists "org members delete material images" on storage.objects;

create policy "org members upload material images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'materials'
    and public.storage_path_in_user_scope(name)
  );

create policy "org members read material images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'materials'
    and public.storage_path_in_user_scope(name)
  );

create policy "org members update material images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'materials'
    and public.storage_path_in_user_scope(name)
  )
  with check (
    bucket_id = 'materials'
    and public.storage_path_in_user_scope(name)
  );

create policy "org members delete material images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'materials'
    and public.storage_path_in_user_scope(name)
  );
