import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from './strings';
import { AppText } from './app-text';
import { colors, minTouchTarget, radii, spacing } from './theme';

type StepperProps = {
  label: string;
  value: number;
  /** Text shown for the value, e.g. "10 signes". */
  display: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

/** A labelled number with large minus / plus buttons. */
export function Stepper({ label, value, display, min, max, onChange }: StepperProps) {
  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.stepper.decrease(label)}
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={[styles.button, value <= min && styles.disabled]}
      >
        <AppText variant="heading">{strings.stepper.minus}</AppText>
      </Pressable>
      <AppText accessibilityLiveRegion="polite" variant="label" style={styles.value}>
        {display}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.stepper.increase(label)}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={[styles.button, value >= max && styles.disabled]}
      >
        <AppText variant="heading">{strings.stepper.plus}</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flex: 1 },
  value: { minWidth: 72, textAlign: 'center' },
  button: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.35 },
});
