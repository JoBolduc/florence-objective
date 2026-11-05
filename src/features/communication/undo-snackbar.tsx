import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/app-text';
import { strings } from '@/ui/strings';
import { colors, minTouchTarget, radii, spacing } from '@/ui/theme';

export const UNDO_VISIBLE_MS = 5000;

/**
 * Floats over the bottom of the screen for 5 seconds. The wrapper ignores touches
 * (`box-none`), so only the snackbar itself intercepts them and the grid stays tappable.
 */
export function UndoSnackbar({
  message,
  onUndo,
  onExpire,
}: {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onExpire, UNDO_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [onExpire]);

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View accessibilityLiveRegion="polite" style={styles.bar}>
        <AppText color="onPrimary" style={styles.message}>
          {message}
        </AppText>
        <Pressable accessibilityRole="button" onPress={onUndo} style={styles.action}>
          <AppText variant="label" color="onPrimary">
            {strings.today.undo}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.text,
  },
  message: {
    flex: 1,
  },
  action: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
