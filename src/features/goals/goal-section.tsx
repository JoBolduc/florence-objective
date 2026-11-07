import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { toLocalDate } from '@/db';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { Stepper } from '@/ui/stepper';
import { strings } from '@/ui/strings';
import { colors, minTouchTarget, radii, spacing, typography } from '@/ui/theme';

import {
  isLocalDate,
  MAX_DAILY_TARGET,
  MAX_PROGRAM_WEEKS,
  MIN_DAILY_TARGET,
  MIN_PROGRAM_WEEKS,
  programEndFor,
  programWeeks,
} from './goal-settings';
import { useGoalSettings } from './goal-settings-provider';

/** Settings: daily target, program start and length. */
export function GoalSection() {
  const { settings, setDailyTarget, setProgram } = useGoalSettings();
  const today = toLocalDate(new Date());
  const target = settings.dailyTargetOn(today);
  const weeks = programWeeks(settings.programStart, settings.programEnd);
  const [startText, setStartText] = useState(settings.programStart);
  const [failed, setFailed] = useState(false);
  const startValid = isLocalDate(startText);

  const run = (action: () => Promise<void>) => {
    setFailed(false);
    action().catch(() => setFailed(true));
  };

  return (
    <View style={styles.section}>
      <AppText accessibilityRole="header" variant="label">
        {strings.goals.title}
      </AppText>
      <Stepper
        label={strings.goals.dailyTarget}
        value={target}
        display={strings.goals.signsPerDay(target)}
        min={MIN_DAILY_TARGET}
        max={MAX_DAILY_TARGET}
        onChange={(v) => run(() => setDailyTarget(v))}
      />
      <AppText color="textMuted">{strings.goals.targetHint}</AppText>
      <Stepper
        label={strings.goals.programLength}
        value={weeks}
        display={strings.goals.weeks(weeks)}
        min={MIN_PROGRAM_WEEKS}
        max={MAX_PROGRAM_WEEKS}
        onChange={(v) =>
          run(() => setProgram(settings.programStart, programEndFor(settings.programStart, v)))
        }
      />
      <AppText>{strings.goals.programStart}</AppText>
      <TextInput
        accessibilityLabel={strings.goals.programStart}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        onChangeText={setStartText}
        placeholder={strings.goals.startPlaceholder}
        style={styles.input}
        value={startText}
      />
      {startValid ? null : <AppText color="danger">{strings.goals.dateInvalid}</AppText>}
      {startValid && startText !== settings.programStart ? (
        <Button
          label={strings.goals.saveStart}
          onPress={() => run(() => setProgram(startText, programEndFor(startText, weeks)))}
        />
      ) : null}
      <AppText color="textMuted">
        {strings.goals.programRange(settings.programStart, settings.programEnd)}
      </AppText>
      {failed ? <AppText color="danger">{strings.goals.saveFailed}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  input: {
    ...typography.body,
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
});
