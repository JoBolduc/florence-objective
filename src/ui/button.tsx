import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { colors, minTouchTarget, radii, spacing } from './theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** Spoken by TalkBack when the visible label is not enough on its own. */
  accessibilityLabel?: string;
};

export function Button({ label, onPress, accessibilityLabel }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <AppText variant="label" color="onPrimary">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  pressed: {
    backgroundColor: colors.primaryPressed,
  },
});
