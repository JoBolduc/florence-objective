import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { strings } from '@/ui/strings';
import { colors, radii, spacing, typography } from '@/ui/theme';

/**
 * Asks for the word she said. Nothing is logged until a word is entered, and closing the
 * sheet logs nothing. The parent decides whether the word counts toward the daily target
 * (off by default: only a word that fits the context is a real communication).
 */
export function WordSheet({
  onSubmit,
  onClose,
}: {
  onSubmit: (word: string, counts: boolean) => void;
  onClose: () => void;
}) {
  const [word, setWord] = useState('');
  const [counts, setCounts] = useState(false);
  const [missing, setMissing] = useState(false);

  const submit = () => {
    const trimmed = word.trim();
    if (!trimmed) {
      setMissing(true);
      return;
    }
    onSubmit(trimmed, counts);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.sheet.close}
          onPress={onClose}
          style={styles.dismiss}
        />
        <View style={styles.sheet}>
          <AppText accessibilityRole="header" variant="heading">
            {strings.word.title}
          </AppText>
          <TextInput
            accessibilityLabel={strings.sheet.wordLabel}
            autoFocus
            value={word}
            onChangeText={(text) => {
              setWord(text);
              if (text.trim()) setMissing(false);
            }}
            onSubmitEditing={submit}
            returnKeyType="done"
            placeholder={strings.word.placeholder}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          {missing && (
            <AppText color="danger" accessibilityLiveRegion="polite">
              {strings.word.required}
            </AppText>
          )}
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText variant="label">{strings.word.countsLabel}</AppText>
              <AppText variant="caption" color="textMuted">
                {strings.word.countsHint}
              </AppText>
            </View>
            <Switch
              accessibilityLabel={strings.word.countsLabel}
              value={counts}
              onValueChange={setCounts}
            />
          </View>
          <View style={styles.actions}>
            <Button label={strings.word.add} onPress={submit} />
            <Button label={strings.sheet.cancel} variant="secondary" onPress={onClose} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 32, 46, 0.4)',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    gap: spacing.md,
    padding: spacing.lg,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    backgroundColor: colors.background,
  },
  input: {
    ...typography.body,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
