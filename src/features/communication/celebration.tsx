import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { AppText } from '@/ui/app-text';
import { strings } from '@/ui/strings';
import { colors, radii, spacing } from '@/ui/theme';

const VISIBLE_MS = 2500;

/** Pops in, stays a moment, fades out, then calls `onDone`. */
export function Celebration({ target, onDone }: { target: number; onDone: () => void }) {
  const [scale] = useState(() => new Animated.Value(0.6));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]),
      Animated.delay(VISIBLE_MS),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => animation.stop();
  }, [scale, opacity, onDone]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[styles.banner, { opacity, transform: [{ scale }] }]}
    >
      <AppText variant="label" color="onPrimary" style={styles.text}>
        {strings.today.celebration(target)}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  text: {
    textAlign: 'center',
  },
});
