import type { SupabaseClient } from '@supabase/supabase-js';

export type JoinFailure = 'invalidInvite' | 'alreadyInHousehold' | 'failed';

/** The household the signed-in parent belongs to, or null if none yet. */
export async function fetchHouseholdId(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client.from('household_member').select('household_id').limit(1);
  if (error) throw new Error(error.message);
  return data?.[0]?.household_id ?? null;
}

/** Creates the household around the child already on this phone. Safe to call twice. */
export async function createHousehold(
  client: SupabaseClient,
  child: { id: string; name: string },
): Promise<string> {
  const { data, error } = await client.rpc('create_household', {
    child_id: child.id,
    child_name: child.name,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** A single-use code (48 h) for the partner. Replaces any earlier unused code. */
export async function createInvite(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.rpc('create_invite');
  if (error) throw new Error(error.message);
  return data as string;
}

/** Groups the code in two for reading aloud: ABCDE12345 -> ABCDE-12345. */
export function formatInviteCode(code: string): string {
  return code.length > 5 ? `${code.slice(0, 5)}-${code.slice(5)}` : code;
}

export async function joinHousehold(
  client: SupabaseClient,
  code: string,
): Promise<{ householdId: string } | { failure: JoinFailure }> {
  const { data, error } = await client.rpc('join_household', { invite_code: code });
  if (!error) return { householdId: data as string };
  if (error.message.includes('invalid_invite')) return { failure: 'invalidInvite' };
  if (error.message.includes('already_in_household')) return { failure: 'alreadyInHousehold' };
  return { failure: 'failed' };
}

/** Initials of each parent in the household, by user id. */
export async function fetchMemberInitials(client: SupabaseClient): Promise<Record<string, string>> {
  const { data, error } = await client.from('household_member').select('user_id, initials');
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((m) => [m.user_id as string, m.initials as string]));
}
