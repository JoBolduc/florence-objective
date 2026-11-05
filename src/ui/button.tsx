import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { colors, minTouchTarget, radii, spacing } from './theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** `secondary` is for dismissing, `danger` for destructive actions. */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Spoken by TalkBack when the visible label is not enough on its own. */
  accessibilityLabel?: string;
};

export function Button({ label, onPress, variant = 'primary', accessibilityLabel }: ButtonProps) {
  const filled = variant !== 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && (variant === 'primary' ? styles.primaryPressed : styles.pressed),
      ]}
    >
      <AppText variant="label" color={filled ? 'onPrimary' : 'text'}>
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
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed,
  },
  pressed: {
    opacity: 0.7,
  },
});
