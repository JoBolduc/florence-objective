import { StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/app-text';
import { strings } from '@/ui/strings';
import { colors, radii, spacing } from '@/ui/theme';

import type { MasteryStatus } from './mastery';

const GLYPH: Record<MasteryStatus, string> = { grey: '○', yellow: '◐', green: '●' };
const TONE = {
  grey: { fg: colors.masteryGrey, bg: colors.masteryGreySoft },
  yellow: { fg: colors.masteryYellow, bg: colors.masteryYellowSoft },
  green: { fg: colors.masteryGreen, bg: colors.masteryGreenSoft },
} as const;

/** Color, symbol and word together, so the status never relies on color alone. */
export function MasteryMarker({ status }: { status: MasteryStatus }) {
  const tone = TONE[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <AppText variant="caption" style={{ color: tone.fg, fontWeight: '700' }}>
        {`${GLYPH[status]} ${strings.mastery[status]}`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
});
