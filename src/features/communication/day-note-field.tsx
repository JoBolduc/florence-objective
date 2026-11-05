import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/ui/app-text';
import { strings } from '@/ui/strings';
import { colors, radii, spacing, typography } from '@/ui/theme';

const SAVE_DELAY_MS = 800;

/**
 * Free-text note for the whole day (bad night, illness, big change). Saved shortly after
 * typing stops, when the field loses focus, and when the screen goes away.
 * Remount it (via `key`) to start from another day's text.
 */
export function DayNoteField({
  initialBody,
  onSave,
}: {
  initialBody: string;
  onSave: (body: string) => void;
}) {
  const [draft, setDraft] = useState(initialBody);
  const savedRef = useRef(initialBody);

  const flush = useCallback(() => {
    if (draft === savedRef.current) return;
    savedRef.current = draft;
    onSave(draft);
  }, [draft, onSave]);

  useEffect(() => {
    const timer = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [flush]);

  const latestFlush = useRef(flush);
  useEffect(() => {
    latestFlush.current = flush;
  }, [flush]);
  useEffect(() => () => latestFlush.current(), []);

  return (
    <View style={styles.section}>
      <AppText variant="label">{strings.dayNote.label}</AppText>
      <TextInput
        accessibilityLabel={strings.dayNote.label}
        multiline
        value={draft}
        onChangeText={setDraft}
        onBlur={flush}
        placeholder={strings.dayNote.placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  input: {
    ...typography.body,
    minHeight: 96,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
