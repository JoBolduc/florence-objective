import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import type { CommunicationTypeRecord, EventRecord } from '@/db';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { formatTime } from '@/ui/format';
import { strings } from '@/ui/strings';
import { colors, minTouchTarget, radii, spacing, typography } from '@/ui/theme';

import { shiftWithinDay } from './adjust-time';
import { WORD_TYPE_ID } from './word-type';

export interface EventChanges {
  typeId: string;
  occurredAt: Date;
  note: string | null;
  counts: boolean;
}

const TIME_STEPS = [
  { minutes: -60, label: '− 1 h' },
  { minutes: -5, label: '− 5 min' },
  { minutes: 5, label: '+ 5 min' },
  { minutes: 60, label: '+ 1 h' },
];

/** Bottom sheet to describe or correct one event: note, type, time, deletion. */
export function EventSheet({
  event,
  types,
  focusNote,
  onSave,
  onDelete,
  onClose,
}: {
  event: EventRecord;
  types: CommunicationTypeRecord[];
  /** Opens the keyboard on the note straight away (after a long-press). */
  focusNote: boolean;
  onSave: (changes: EventChanges) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(event.note ?? '');
  const [typeId, setTypeId] = useState(event.typeId);
  const [occurredAt, setOccurredAt] = useState(() => new Date(event.occurredAt));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [counts, setCounts] = useState(event.counts);
  const [wordMissing, setWordMissing] = useState(false);
  const isWord = typeId === WORD_TYPE_ID;

  const save = () => {
    const trimmed = note.trim();
    if (isWord && !trimmed) {
      setWordMissing(true);
      return;
    }
    // Only a word can be left out of the counter; every other type always counts.
    onSave({ typeId, occurredAt, note: trimmed || null, counts: isWord ? counts : true });
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
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppText accessibilityRole="header" variant="heading">
              {strings.sheet.title}
            </AppText>

            <AppText variant="label">{strings.sheet.typeLabel}</AppText>
            <View style={styles.wrap}>
              {types.map((type) => (
                <Pressable
                  key={type.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: type.id === typeId }}
                  accessibilityLabel={type.label}
                  onPress={() => setTypeId(type.id)}
                  style={[styles.typeChip, type.id === typeId && styles.typeChipSelected]}
                >
                  <AppText variant="heading">{type.icon}</AppText>
                  <AppText variant="caption">{type.label}</AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="label">{strings.sheet.timeValue(formatTime(occurredAt))}</AppText>
            <View style={styles.wrap}>
              {TIME_STEPS.map((step) => (
                <Button
                  key={step.minutes}
                  label={step.label}
                  variant="secondary"
                  accessibilityLabel={
                    step.minutes < 0
                      ? strings.sheet.shiftBack(step.label.slice(2))
                      : strings.sheet.shiftForward(step.label.slice(2))
                  }
                  onPress={() =>
                    setOccurredAt((current) => shiftWithinDay(current, step.minutes, new Date()))
                  }
                />
              ))}
            </View>

            <AppText variant="label">
              {isWord ? strings.sheet.wordLabel : strings.sheet.noteLabel}
            </AppText>
            <TextInput
              accessibilityLabel={isWord ? strings.sheet.wordLabel : strings.sheet.noteLabel}
              multiline
              autoFocus={focusNote}
              value={note}
              onChangeText={(text) => {
                setNote(text);
                if (text.trim()) setWordMissing(false);
              }}
              placeholder={isWord ? strings.word.placeholder : strings.sheet.notePlaceholder}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            {isWord && wordMissing && (
              <AppText color="danger" accessibilityLiveRegion="polite">
                {strings.sheet.wordRequired}
              </AppText>
            )}
            {isWord && (
              <View style={styles.switchRow}>
                <AppText variant="label" style={styles.switchText}>
                  {strings.word.countsLabel}
                </AppText>
                <Switch
                  accessibilityLabel={strings.word.countsLabel}
                  value={counts}
                  onValueChange={setCounts}
                />
              </View>
            )}

            <View style={styles.wrap}>
              <Button label={strings.sheet.save} onPress={save} />
              <Button label={strings.sheet.cancel} variant="secondary" onPress={onClose} />
            </View>

            {confirmingDelete ? (
              <View accessibilityLiveRegion="polite" style={styles.confirm}>
                <AppText>{strings.sheet.confirmDelete}</AppText>
                <View style={styles.wrap}>
                  <Button label={strings.sheet.delete} variant="danger" onPress={onDelete} />
                  <Button
                    label={strings.sheet.keep}
                    variant="secondary"
                    onPress={() => setConfirmingDelete(false)}
                  />
                </View>
              </View>
            ) : (
              <Button
                label={strings.sheet.delete}
                variant="secondary"
                onPress={() => setConfirmingDelete(true)}
              />
            )}
          </ScrollView>
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
    maxHeight: '85%',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    minWidth: minTouchTarget + spacing.lg,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  typeChipSelected: {
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
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
  confirm: {
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
  },
});
