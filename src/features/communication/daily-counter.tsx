import { StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/app-text';
import { strings } from '@/ui/strings';
import { colors } from '@/ui/theme';

import { DAILY_TARGET } from './daily-target';
import { ringDots } from './ring';

const RADIUS = 72;
const DOT = 18;
const SIZE = 2 * RADIUS + DOT;

/** Progress ring made of one dot per target sign, with "7 / 10" in the middle. */
export function DailyCounter({ count }: { count: number }) {
  return (
    <View
      accessible
      accessibilityLabel={strings.today.counter(count, DAILY_TARGET)}
      accessibilityLiveRegion="polite"
      style={styles.ring}
    >
      {ringDots(count, DAILY_TARGET, RADIUS).map((dot, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { left: SIZE / 2 + dot.x - DOT / 2, top: SIZE / 2 + dot.y - DOT / 2 },
            dot.filled && styles.dotFilled,
          ]}
        />
      ))}
      <AppText variant="heading">{strings.today.counterText(count, DAILY_TARGET)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primarySoft,
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
