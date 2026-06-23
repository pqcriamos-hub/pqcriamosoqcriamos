-- Storage RLS policies for the private "site-media" bucket.
-- Editors/admins manage objects; public viewing happens via long-lived signed URLs.

create policy "site-media editors can read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'site-media'
  and (
    private.has_role(auth.uid(), 'editor'::public.app_role)
    or private.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

create policy "site-media editors can insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-media'
  and (
    private.has_role(auth.uid(), 'editor'::public.app_role)
    or private.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

create policy "site-media editors can update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-media'
  and (
    private.has_role(auth.uid(), 'editor'::public.app_role)
    or private.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
with check (
  bucket_id = 'site-media'
  and (
    private.has_role(auth.uid(), 'editor'::public.app_role)
    or private.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

create policy "site-media editors can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-media'
  and (
    private.has_role(auth.uid(), 'editor'::public.app_role)
    or private.has_role(auth.uid(), 'admin'::public.app_role)
  )
);