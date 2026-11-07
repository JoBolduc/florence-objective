import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { strings } from '@/ui/strings';
import { colors, radii, spacing, typography } from '@/ui/theme';

import { isValidEmail, normalizeEmail } from './email';
import { supabase } from './supabase';

/** Email and password for the accounts created in the Supabase dashboard. */
export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabase) return null;
  const auth = supabase.auth;

  async function signIn() {
    if (!isValidEmail(email)) {
      setError(strings.account.emailInvalid);
      return;
    }
    if (password.length === 0) {
      setError(strings.account.passwordRequired);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: failure } = await auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    setBusy(false);
    // On success the session provider sees the new session and swaps this form out.
    if (failure) setError(strings.account.signInFailed);
  }

  return (
    <View style={styles.form}>
      <AppText>{strings.account.signInPrompt}</AppText>
      <TextInput
        accessibilityLabel={strings.account.emailLabel}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder={strings.account.emailPlaceholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <TextInput
        accessibilityLabel={strings.account.passwordLabel}
        autoCapitalize="none"
        autoComplete="current-password"
        autoCorrect={false}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder={strings.account.passwordLabel}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <Button label={strings.account.signIn} onPress={signIn} />
      {busy ? <AppText color="textMuted">{strings.account.working}</AppText> : null}
      {error ? (
        <AppText color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
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
