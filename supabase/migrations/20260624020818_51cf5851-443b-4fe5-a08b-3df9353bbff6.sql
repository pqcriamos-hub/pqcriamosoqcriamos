drop policy if exists "Editors can read whitelisted site content" on public.site_content;
drop policy if exists "Editors can insert site content" on public.site_content;
drop policy if exists "Editors can update site content" on public.site_content;
drop policy if exists "Editors can delete site content" on public.site_content;

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
      'support-content', 'card-tags',
      'episodes-admin', 'episode-embeds-admin', 'artists-admin',
      'gallery-cards-admin', 'support-content-admin'
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
      'support-content', 'card-tags',
      'episodes-admin', 'episode-embeds-admin', 'artists-admin',
      'gallery-cards-admin', 'support-content-admin'
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
      'support-content', 'card-tags',
      'episodes-admin', 'episode-embeds-admin', 'artists-admin',
      'gallery-cards-admin', 'support-content-admin'
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
      'support-content', 'card-tags',
      'episodes-admin', 'episode-embeds-admin', 'artists-admin',
      'gallery-cards-admin', 'support-content-admin'
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
      'support-content', 'card-tags',
      'episodes-admin', 'episode-embeds-admin', 'artists-admin',
      'gallery-cards-admin', 'support-content-admin'
    )
  );