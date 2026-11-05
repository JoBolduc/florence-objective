import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { CommunicationTypeRecord, EventRecord } from '@/db';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { strings } from '@/ui/strings';
import { colors, radii, spacing, typography } from '@/ui/theme';

export interface EventChanges {
  note: string | null;
}

/** Bottom sheet to add or edit the note of one event (E1-S6). */
export function EventSheet({
  event,
  type,
  onSave,
  onClose,
}: {
  event: EventRecord;
  type: CommunicationTypeRecord | undefined;
  onSave: (changes: EventChanges) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(event.note ?? '');

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
            {type ? `${type.icon} ${type.label}` : event.typeId}
          </AppText>
          <TextInput
            accessibilityLabel={strings.sheet.noteLabel}
            multiline
            autoFocus
            value={note}
            onChangeText={setNote}
            placeholder={strings.sheet.notePlaceholder}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <View style={styles.actions}>
            <Button
              label={strings.sheet.save}
              onPress={() => onSave({ note: note.trim() || null })}
            />
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
    minHeight: 120,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
