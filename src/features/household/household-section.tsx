import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { supabase } from '@/features/account/supabase';
import { DEFAULT_CHILD_NAME } from '@/features/communication/use-tap-grid';
import { useSync } from '@/features/sync/sync-provider';
import { useRepositories } from '@/db';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { strings } from '@/ui/strings';
import { colors, radii, spacing, typography } from '@/ui/theme';

import {
  createHousehold,
  createInvite,
  fetchHouseholdId,
  formatInviteCode,
  joinHousehold,
} from './household-api';
import { discardUnsyncedLocalData, getHouseholdId, setHouseholdId } from './local-household';

type State = 'loading' | 'none' | 'member' | 'loadFailed';

/** Create the household and invite the partner, or join the partner's with their code. */
export function HouseholdSection() {
  const db = useSQLiteContext();
  const { children } = useRepositories();
  const { attachHousehold } = useSync();
  const [state, setState] = useState<State>('loading');
  const [householdId, setHousehold] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let id = await getHouseholdId(db);
      if (!id && supabase) {
        id = await fetchHouseholdId(supabase);
        if (id) await setHouseholdId(db, id);
      }
      if (cancelled) return;
      setHousehold(id);
      setState(id ? 'member' : 'none');
    })().catch(() => {
      if (!cancelled) setState('loadFailed');
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  async function create() {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    try {
      const child = await children.getOrCreateFirst(DEFAULT_CHILD_NAME);
      const id = await createHousehold(supabase, child);
      await setHouseholdId(db, id);
      setHousehold(id);
      setState('member');
      attachHousehold(id);
    } catch {
      setMessage(strings.household.createFailed);
    }
    setBusy(false);
  }

  async function join() {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await joinHousehold(supabase, joinCode);
      if ('failure' in result) {
        setMessage(
          result.failure === 'invalidInvite'
            ? strings.household.invalidInvite
            : result.failure === 'alreadyInHousehold'
              ? strings.household.alreadyMember
              : strings.household.joinFailed,
        );
      } else {
        await discardUnsyncedLocalData(db);
        await setHouseholdId(db, result.householdId);
        setHousehold(result.householdId);
        setState('member');
        attachHousehold(result.householdId);
      }
    } catch {
      setMessage(strings.household.joinFailed);
    }
    setBusy(false);
  }

  async function invite() {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    try {
      setInviteCode(await createInvite(supabase));
    } catch {
      setMessage(strings.household.inviteFailed);
    }
    setBusy(false);
  }

  return (
    <View style={styles.section}>
      <AppText accessibilityRole="header" variant="label">
        {strings.household.title}
      </AppText>
      {state === 'loading' ? <AppText color="textMuted">{strings.today.loading}</AppText> : null}
      {state === 'loadFailed' ? (
        <AppText color="danger">{strings.household.loadFailed}</AppText>
      ) : null}
      {state === 'none' ? (
        <>
          <AppText>{strings.household.createPrompt}</AppText>
          <Button label={strings.household.create} onPress={create} />
          <AppText>{strings.household.joinPrompt}</AppText>
          <TextInput
            accessibilityLabel={strings.household.joinLabel}
            autoCapitalize="characters"
            autoCorrect={false}
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder={strings.household.joinPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <AppText color="textMuted">{strings.household.joinWarning}</AppText>
          <Button label={strings.household.join} onPress={join} />
        </>
      ) : null}
      {state === 'member' && householdId ? (
        <>
          <AppText>{strings.household.member}</AppText>
          {inviteCode ? (
            <>
              <AppText
                variant="display"
                accessibilityLabel={strings.household.codeSpoken(inviteCode)}
              >
                {formatInviteCode(inviteCode)}
              </AppText>
              <AppText color="textMuted">{strings.household.inviteHint}</AppText>
            </>
          ) : null}
          <Button
            label={inviteCode ? strings.household.newInvite : strings.household.invite}
            variant={inviteCode ? 'secondary' : 'primary'}
            onPress={invite}
          />
        </>
      ) : null}
      {busy ? <AppText color="textMuted">{strings.account.working}</AppText> : null}
      {message ? (
        <AppText color="danger" accessibilityLiveRegion="polite">
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  input: {
    ...typography.body,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
});
