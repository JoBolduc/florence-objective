import { StyleSheet, View } from 'react-native';

import { useSession } from '@/features/account/session';
import { SignInForm } from '@/features/account/sign-in-form';
import { supabase } from '@/features/account/supabase';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { strings } from '@/ui/strings';
import { colors, spacing } from '@/ui/theme';

export default function Settings() {
  const session = useSession();

  return (
    <View style={styles.container}>
      <AppText accessibilityRole="header" variant="heading">
        {strings.tabs.settings}
      </AppText>
      <AppText accessibilityRole="header" variant="label">
        {strings.account.title}
      </AppText>
      {session.status === 'unavailable' ? (
        <AppText color="textMuted">{strings.account.unavailable}</AppText>
      ) : null}
      {session.status === 'loading' ? (
        <AppText color="textMuted">{strings.today.loading}</AppText>
      ) : null}
      {session.status === 'signedOut' ? <SignInForm /> : null}
      {session.status === 'signedIn' ? (
        <>
          <AppText>{strings.account.signedInAs(session.session.user.email ?? '')}</AppText>
          <Button
            label={strings.account.signOut}
            variant="secondary"
            onPress={() => {
              supabase?.auth.signOut().catch(() => {});
            }}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
});
