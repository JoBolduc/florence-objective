-- E2-S4: create a household, invite the partner with a one-time code, join with it.
-- Everything goes through functions: the tables have no insert policy (see the RLS migration).

create table household_invite (
  code text primary key,
  household_id uuid not null references household (id) on delete cascade,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours',
  used_by uuid references auth.users (id),
  used_at timestamptz
);
-- RLS on with no policy: clients can never read or list codes directly.
alter table household_invite enable row level security;
revoke all on household_invite from anon, authenticated;

-- Creates the caller's household with their child. Idempotent: a parent already in a
-- household gets it back unchanged.
create function create_household(child_id uuid, child_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select household_id into hid from household_member where user_id = auth.uid();
  if hid is not null then
    return hid;
  end if;
  insert into household default values returning id into hid;
  insert into household_member (household_id, user_id) values (hid, auth.uid());
  insert into child (id, household_id, name, created_at, updated_at, logged_by)
    values (child_id, hid, child_name, now(), now(), auth.uid());
  return hid;
end;
$$;

-- A fresh code for the caller's household; earlier unused codes stop working.
create function create_invite() returns text
language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
  new_code text;
begin
  select household_id into hid from household_member where user_id = auth.uid();
  if hid is null then
    raise exception 'no_household' using errcode = 'P0001';
  end if;
  delete from household_invite where household_id = hid and used_at is null;
  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into household_invite (code, household_id, created_by) values (new_code, hid, auth.uid());
  return new_code;
end;
$$;

-- Joins the household of an unused, unexpired code. The code works exactly once.
create function join_household(invite_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  invite household_invite;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from household_member where user_id = auth.uid()) then
    raise exception 'already_in_household' using errcode = 'P0001';
  end if;
  select * into invite from household_invite
    where code = upper(regexp_replace(invite_code, '[^A-Za-z0-9]', '', 'g'))
    for update;
  if not found or invite.used_at is not null or invite.expires_at < now() then
    raise exception 'invalid_invite' using errcode = 'P0001';
  end if;
  insert into household_member (household_id, user_id) values (invite.household_id, auth.uid());
  update household_invite set used_by = auth.uid(), used_at = now() where code = invite.code;
  return invite.household_id;
end;
$$;

revoke all on function create_household(uuid, text), create_invite(), join_household(text)
  from public, anon;
grant execute on function create_household(uuid, text), create_invite(), join_household(text)
  to authenticated;
