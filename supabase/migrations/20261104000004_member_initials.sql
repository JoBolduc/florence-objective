-- E2-S7: each parent gets initials (from their email) so the timeline can show who logged
-- an event without exposing the partner's email address.

alter table household_member add column initials text;

-- "jonathan.bolduc@x.com" -> "JB"; "marie@x.com" -> "MA"; unknown -> "?"
create function initials_from_email(email text) returns text
language sql immutable as $$
  select coalesce(
    nullif(
      upper(
        case
          when array_length(parts, 1) >= 2 then left(parts[1], 1) || left(parts[2], 1)
          else left(parts[1], 2)
        end
      ),
      ''
    ),
    '?'
  )
  from (select regexp_split_to_array(split_part(coalesce(email, ''), '@', 1), '[._+-]+') as parts) s
$$;

update household_member m
  set initials = initials_from_email((select email from auth.users u where u.id = m.user_id));

alter table household_member alter column initials set default '?';

-- The membership writers now record initials.
create or replace function create_household(child_id uuid, child_name text) returns uuid
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
  insert into household_member (household_id, user_id, initials)
    values (hid, auth.uid(), initials_from_email(auth.jwt() ->> 'email'));
  insert into child (id, household_id, name, created_at, updated_at, logged_by)
    values (child_id, hid, child_name, now(), now(), auth.uid());
  return hid;
end;
$$;

create or replace function join_household(invite_code text) returns uuid
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
  insert into household_member (household_id, user_id, initials)
    values (invite.household_id, auth.uid(), initials_from_email(auth.jwt() ->> 'email'));
  update household_invite set used_by = auth.uid(), used_at = now() where code = invite.code;
  return invite.household_id;
end;
$$;
