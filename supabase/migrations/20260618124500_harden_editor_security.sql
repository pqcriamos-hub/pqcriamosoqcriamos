begin;

-- Bootstrap a private/public visibility flag when legacy projects do not expose one yet.
do $$
begin
  if to_regclass('public.site_content') is not null
    and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'site_content'
        and column_name in ('published', 'is_published')
    ) then
    alter table public.site_content
      add column published boolean;

    update public.site_content
    set published = false
    where published is null;

    alter table public.site_content
      alter column published set default false;

    alter table public.site_content
      alter column published set not null;
  end if;
end
$$;

-- Fail fast if the expected baseline objects are not present in the project DB.
do $$
begin
  if to_regtype('public.app_role') is null then
    raise exception 'Missing type public.app_role';
  end if;

  if to_regclass('public.user_roles') is null then
    raise exception 'Missing table public.user_roles';
  end if;

  if to_regclass('public.site_content') is null then
    raise exception 'Missing table public.site_content';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_content'
      and column_name = 'key'
  ) then
    raise exception 'Missing column public.site_content.key';
  end if;

end
$$;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to authenticated;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where public.user_roles.user_id = _user_id
      and public.user_roles.role = _role
  );
$$;

revoke all on function private.has_role(uuid, public.app_role) from public;
grant execute on function private.has_role(uuid, public.app_role) to authenticated;

alter table public.user_roles enable row level security;

revoke all on table public.user_roles from public;
revoke all on table public.user_roles from anon;
revoke all on table public.user_roles from authenticated;
grant select on table public.user_roles to authenticated;
grant all on table public.user_roles to service_role;

drop policy if exists "Users can read their own roles" on public.user_roles;
drop policy if exists "Authenticated users can read their own roles" on public.user_roles;

create policy "Authenticated users can read their own roles"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

alter table public.site_content enable row level security;

revoke all on table public.site_content from public;
revoke all on table public.site_content from anon;
revoke all on table public.site_content from authenticated;
grant select on table public.site_content to anon;
grant select, insert, update, delete on table public.site_content to authenticated;
grant all on table public.site_content to service_role;

drop policy if exists "Anyone can read site content" on public.site_content;
drop policy if exists "Public can read published content" on public.site_content;
drop policy if exists "Public can read published site content" on public.site_content;
drop policy if exists "Editors can read site content" on public.site_content;
drop policy if exists "Editors can read whitelisted site content" on public.site_content;
drop policy if exists "Editors can insert site content" on public.site_content;
drop policy if exists "Editors can update site content" on public.site_content;
drop policy if exists "Editors can delete site content" on public.site_content;

do $$
declare
  publish_predicate text;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_content'
      and column_name = 'published'
  ) then
    publish_predicate := 'published is true';
  else
    publish_predicate := 'is_published is true';
  end if;

  execute format(
    $policy$
      create policy "Public can read published site content"
        on public.site_content
        for select
        to anon, authenticated
        using (
          key in ('editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds')
          and %s
        )
    $policy$,
    publish_predicate
  );
end
$$;

create policy "Editors can read whitelisted site content"
  on public.site_content
  for select
  to authenticated
  using (
    (
      private.has_role(auth.uid(), 'editor'::public.app_role)
      or private.has_role(auth.uid(), 'admin'::public.app_role)
    )
    and key in ('editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds')
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
    and key in ('editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds')
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
    and key in ('editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds')
  )
  with check (
    (
      private.has_role(auth.uid(), 'editor'::public.app_role)
      or private.has_role(auth.uid(), 'admin'::public.app_role)
    )
    and key in ('editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds')
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
    and key in ('editable-content', 'style-state', 'artists', 'episodes', 'episode-embeds')
  );

drop function if exists public.has_role(uuid, public.app_role);

commit;
