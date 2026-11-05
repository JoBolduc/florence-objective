import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { strings } from '@/ui/strings';
import { colors, radii, spacing, typography } from '@/ui/theme';

import {
  CODE_LENGTH,
  isCompleteCode,
  isValidEmail,
  normalizeCode,
  normalizeEmail,
} from './email-code';
import { supabase } from './supabase';

type Step = 'email' | 'code';

/** Two steps: ask for the address, then for the six-digit code emailed to it. */
export function SignInForm() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabase) return null;
  const auth = supabase.auth;

  async function sendCode() {
    if (!isValidEmail(email)) {
      setError(strings.account.emailInvalid);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: failure } = await auth.signInWithOtp({ email: normalizeEmail(email) });
    setBusy(false);
    if (failure) setError(strings.account.sendFailed);
    else setStep('code');
  }

  async function verify() {
    if (!isCompleteCode(code)) {
      setError(strings.account.codeInvalid);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: failure } = await auth.verifyOtp({
      email: normalizeEmail(email),
      token: normalizeCode(code),
      type: 'email',
    });
    setBusy(false);
    // On success the session provider sees the new session and swaps this form out.
    if (failure) setError(strings.account.verifyFailed);
  }

  return (
    <View style={styles.form}>
      {step === 'email' ? (
        <>
          <AppText>{strings.account.emailPrompt}</AppText>
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
          <Button label={strings.account.sendCode} onPress={sendCode} />
        </>
      ) : (
        <>
          <AppText>{strings.account.codePrompt(normalizeEmail(email))}</AppText>
          <TextInput
            accessibilityLabel={strings.account.codeLabel}
            autoComplete="one-time-code"
            keyboardType="number-pad"
            maxLength={CODE_LENGTH + 4}
            value={code}
            onChangeText={setCode}
            placeholder={strings.account.codePlaceholder}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Button label={strings.account.verify} onPress={verify} />
          <Button
            label={strings.account.changeEmail}
            variant="secondary"
            onPress={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
          />
        </>
      )}
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
