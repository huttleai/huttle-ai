create table if not exists public.content_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.content_collection_items (
  collection_id uuid not null references public.content_collections(id) on delete cascade,
  content_item_id uuid not null references public.content_library(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, content_item_id)
);

create index if not exists idx_content_collections_user_id
  on public.content_collections(user_id);

create index if not exists idx_content_collections_created_at
  on public.content_collections(created_at desc);

create index if not exists idx_content_collection_items_content_item_id
  on public.content_collection_items(content_item_id);

alter table public.content_collections enable row level security;
alter table public.content_collection_items enable row level security;

drop policy if exists "Users can view own content collections" on public.content_collections;
create policy "Users can view own content collections"
  on public.content_collections
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own content collections" on public.content_collections;
create policy "Users can insert own content collections"
  on public.content_collections
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own content collections" on public.content_collections;
create policy "Users can update own content collections"
  on public.content_collections
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own content collections" on public.content_collections;
create policy "Users can delete own content collections"
  on public.content_collections
  for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own content collection items" on public.content_collection_items;
create policy "Users can view own content collection items"
  on public.content_collection_items
  for select
  using (
    exists (
      select 1
      from public.content_collections cc
      where cc.id = collection_id
        and cc.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert own content collection items" on public.content_collection_items;
create policy "Users can insert own content collection items"
  on public.content_collection_items
  for insert
  with check (
    exists (
      select 1
      from public.content_collections cc
      where cc.id = collection_id
        and cc.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.content_library cl
      where cl.id = content_item_id
        and cl.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete own content collection items" on public.content_collection_items;
create policy "Users can delete own content collection items"
  on public.content_collection_items
  for delete
  using (
    exists (
      select 1
      from public.content_collections cc
      where cc.id = collection_id
        and cc.user_id = (select auth.uid())
    )
  );

create or replace function public.update_content_collections_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_content_collections_updated_at on public.content_collections;
create trigger update_content_collections_updated_at
  before update on public.content_collections
  for each row
  execute function public.update_content_collections_updated_at();
