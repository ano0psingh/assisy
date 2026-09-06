-- Phase 2: durable per-entity reconciliation.
-- Safe to apply after 001_user_data.sql; clients fall back to user_data until it exists.

alter table public.user_data
  add column if not exists sync_meta jsonb not null default '{"tombstones": {}}'::jsonb;

create table if not exists public.sync_entities (
  user_id uuid not null references auth.users(id) on delete cascade,
  collection text not null,
  entity_id text not null,
  payload jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, collection, entity_id),
  constraint sync_entities_collection_not_empty check (length(collection) > 0),
  constraint sync_entities_entity_id_not_empty check (length(entity_id) > 0),
  constraint sync_entities_deleted_payload_check
    check (deleted_at is null or payload is null)
);

create index if not exists sync_entities_user_updated_idx
  on public.sync_entities (user_id, updated_at desc);

create sequence if not exists public.sync_entity_revision_seq;

alter table public.sync_entities enable row level security;

drop policy if exists "Users can read own sync entities" on public.sync_entities;
create policy "Users can read own sync entities"
  on public.sync_entities for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own sync entities" on public.sync_entities;
create policy "Users can insert own sync entities"
  on public.sync_entities for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own sync entities" on public.sync_entities;
create policy "Users can update own sync entities"
  on public.sync_entities for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own sync entities" on public.sync_entities;
create policy "Users can delete own sync entities"
  on public.sync_entities for delete
  using (auth.uid() = user_id);

-- Revisions are assigned by the database, not device clocks. The client sends
-- mutations in reconciliation order, with the freshly merged snapshot last.
-- Server ordering avoids a fast device clock blocking every other device.
create or replace function public.assign_sync_entity_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.revision := nextval('public.sync_entity_revision_seq');
  new.updated_at := now();
  if new.deleted_at is not null then
    new.deleted_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists keep_newest_sync_entity on public.sync_entities;
drop trigger if exists assign_sync_entity_revision on public.sync_entities;
create trigger assign_sync_entity_revision
before insert or update on public.sync_entities
for each row execute function public.assign_sync_entity_revision();
