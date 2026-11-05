import type { SupabaseClient } from '@supabase/supabase-js';

import { formatInviteCode, joinHousehold } from '../household-api';

const clientReturning = (result: { data?: unknown; error?: { message: string } | null }) =>
  ({ rpc: async () => ({ data: null, error: null, ...result }) }) as unknown as SupabaseClient;

describe('household api', () => {
  it('returns the household id when the code is accepted', async () => {
    expect(await joinHousehold(clientReturning({ data: 'h1' }), 'ABC')).toEqual({
      householdId: 'h1',
    });
  });

  it('maps server errors to a failure the screen can explain', async () => {
    expect(
      await joinHousehold(clientReturning({ error: { message: 'invalid_invite' } }), 'x'),
    ).toEqual({
      failure: 'invalidInvite',
    });
    expect(
      await joinHousehold(clientReturning({ error: { message: 'already_in_household' } }), 'x'),
    ).toEqual({ failure: 'alreadyInHousehold' });
    expect(await joinHousehold(clientReturning({ error: { message: 'timeout' } }), 'x')).toEqual({
      failure: 'failed',
    });
  });

  it('groups the code for reading aloud', () => {
    expect(formatInviteCode('ABCDE12345')).toBe('ABCDE-12345');
  });
});
