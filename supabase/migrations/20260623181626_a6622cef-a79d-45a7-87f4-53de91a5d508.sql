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
      'gallery-cards', 'page-photos', 'link-state', 'layout-state',
      'support-content', 'card-tags'
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
      'gallery-cards', 'page-photos', 'link-state', 'layout-state',
      'support-content', 'card-tags'
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
      'gallery-cards', 'page-photos', 'link-state', 'layout-state',
      'support-content', 'card-tags'
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
      'gallery-cards', 'page-photos', 'link-state', 'layout-state',
      'support-content', 'card-tags'
    )
  )
  with check (
    (
      private.has_role(auth.uid(), 'editor'::public.app_role)
      or private.has_role(auth.uid(), 'admin'::public.app_role)
    )
    and key in (
      'editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds',
      'gallery-cards', 'page-photos', 'link-state', 'layout-state',
      'support-content', 'card-tags'
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
      'gallery-cards', 'page-photos', 'link-state', 'layout-state',
      'support-content', 'card-tags'
    )
  );