-- Phase 1: expand site_content whitelist + ensure unique key for upserts

-- 1) Ensure a unique constraint/index on key so upsert(onConflict: "key") works.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.site_content'::regclass
      and contype in ('p', 'u')
      and conkey = array[
        (select attnum from pg_attribute
          where attrelid = 'public.site_content'::regclass and attname = 'key')
      ]
  ) and not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'site_content'
      and indexname = 'site_content_key_key'
  ) then
    alter table public.site_content
      add constraint site_content_key_key unique (key);
  end if;
end
$$;

-- 2) Recreate policies with the expanded whitelist.
drop policy if exists "Public can read published site content" on public.site_content;
drop policy if exists "Editors can read whitelisted site content" on public.site_content;
drop policy if exists "Editors can insert site content" on public.site_content;
drop policy if exists "Editors can update site content" on public.site_content;
drop policy if exists "Editors can delete site content" on public.site_content;

create policy "Public can read published site content"
  on public.site_content
  for select
  to anon, authenticated
  using (
    key in (
      'editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds',
      'gallery-cards', 'page-photos', 'link-state', 'layout-state'
    )
    and published is true
  );

create policy "Editors can read whitelisted site content"
  on public.site_content
  for select
  to authenticated
  using (
    (
      private.has_role(auth.uid(), 'editor'::public.app_role)
      or private.has_role(auth.uid(), 'admin'::public.app_role)
    )
    and key in (
      'editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds',
      'gallery-cards', 'page-photos', 'link-state', 'layout-state'
    )
  );

create policy "Editors can insert site content"
  on public.site_content
  for insert
  to authenticated
  with check (
    (
      private.has_role(auth.uid(), 'editor'::public.app_role)
      or private.has_role(auth.uid(), 'admin'::public.app_role)
    )
    and key in (
      'editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds',
      'gallery-cards', 'page-photos', 'link-state', 'layout-state'
    )
  );

create policy "Editors can update site content"
  on public.site_content
  for update
  to authenticated
  using (
    (
      private.has_role(auth.uid(), 'editor'::public.app_role)
      or private.has_role(auth.uid(), 'admin'::public.app_role)
    )
    and key in (
      'editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds',
      'gallery-cards', 'page-photos', 'link-state', 'layout-state'
    )
  )
  with check (
    (
      private.has_role(auth.uid(), 'editor'::public.app_role)
      or private.has_role(auth.uid(), 'admin'::public.app_role)
    )
    and key in (
      'editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds',
      'gallery-cards', 'page-photos', 'link-state', 'layout-state'
    )
  );

create policy "Editors can delete site content"
  on public.site_content
  for delete
  to authenticated
  using (
    (
      private.has_role(auth.uid(), 'editor'::public.app_role)
      or private.has_role(auth.uid(), 'admin'::public.app_role)
    )
    and key in (
      'editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds',
      'gallery-cards', 'page-photos', 'link-state', 'layout-state'
    )
  );