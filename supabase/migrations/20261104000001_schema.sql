-- E2-S1: server schema mirroring the local SQLite schema (src/db/migrations.ts).
-- Every synced table has the same sync columns as the app, plus household_id (owner
-- for row-level security, E2-S2) and server_synced_at (the pull cursor).

create table household (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table household_member (
  household_id uuid not null references household (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
-- One household per parent (the app tracks one child).
create unique index household_member_user on household_member (user_id);

create table child (
  id uuid primary key,
  household_id uuid not null references household (id) on delete cascade,
  name text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  logged_by uuid references auth.users (id),
  server_synced_at timestamptz not null default clock_timestamp()
);

create table event (
  id uuid primary key,
  household_id uuid not null references household (id) on delete cascade,
  child_id uuid not null references child (id),
  type_id text not null,
  occurred_at timestamptz not null,
  local_date date not null,
  note text,
  counts boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  logged_by uuid references auth.users (id),
  server_synced_at timestamptz not null default clock_timestamp()
);
create index event_household_cursor on event (household_id, server_synced_at);
create index event_child_day on event (child_id, local_date, occurred_at);

create table day_note (
  id uuid primary key,
  household_id uuid not null references household (id) on delete cascade,
  child_id uuid not null references child (id),
  local_date date not null,
  body text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  logged_by uuid references auth.users (id),
  server_synced_at timestamptz not null default clock_timestamp()
);
create index day_note_household_cursor on day_note (household_id, server_synced_at);
create index child_household_cursor on child (household_id, server_synced_at);

-- Sync rules, applied on the server so every client gets them:
-- * last write wins: an upsert older than the stored row is ignored;
-- * server_synced_at is stamped on every accepted write, so clients pull by it
--   instead of trusting phone clocks.
create function sync_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then
      return null;
    end if;
    -- Ownership never moves between households.
    new.household_id := old.household_id;
  end if;
  new.server_synced_at := clock_timestamp();
  return new;
end;
$$;

create trigger child_sync_guard before insert or update on child
  for each row execute function sync_guard();
create trigger event_sync_guard before insert or update on event
  for each row execute function sync_guard();
create trigger day_note_sync_guard before insert or update on day_note
  for each row execute function sync_guard();
