-- Run with `npx supabase test db` (pgTAP). Two accounts: alice is in a household, mallory is not.
begin;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'mallory@example.test');
insert into household (id) values ('11111111-1111-1111-1111-111111111111');
insert into household_member (household_id, user_id)
  values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a');

-- alice (member)
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);

select lives_ok($$
  insert into child (id, household_id, name, created_at, updated_at)
  values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
          'Florence', now(), now())$$, 'member can write to the household');
select is((select count(*)::int from child), 1, 'member reads the household child');

-- mallory (outside the household)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);

select is((select count(*)::int from child), 0, 'outsider reads no child');
select is((select count(*)::int from household), 0, 'outsider reads no household');
select is((select count(*)::int from household_member), 0, 'outsider reads no membership');
select throws_ok($$
  insert into child (id, household_id, name, created_at, updated_at)
  values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
          'Intruder', now(), now())$$, '42501', null, 'outsider cannot insert into the household');
select throws_ok($$
  insert into household_member (household_id, user_id)
  values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000b')$$,
  '42501', null, 'outsider cannot add themselves to the household');

update child set name = 'Hacked';
reset role;
select is((select name from child), 'Florence', 'outsider cannot update the child');

select * from finish();
rollback;
