-- E2-S2: a household's rows are visible and writable only to its members.
-- Households and memberships are created through functions (E2-S4), never directly.

create function is_household_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from household_member
    where household_id = hid and user_id = auth.uid()
  );
$$;
revoke all on function is_household_member(uuid) from public, anon;
grant execute on function is_household_member(uuid) to authenticated;

alter table household enable row level security;
alter table household_member enable row level security;
alter table child enable row level security;
alter table event enable row level security;
alter table day_note enable row level security;

create policy household_read on household
  for select to authenticated using (is_household_member(id));

create policy household_member_read on household_member
  for select to authenticated using (is_household_member(household_id));

create policy child_all on child
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy event_all on event
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

create policy day_note_all on day_note
  for all to authenticated
  using (is_household_member(household_id))
  with check (is_household_member(household_id));

-- No policy grants anon anything; also drop the default table privileges.
revoke all on household, household_member, child, event, day_note from anon;
