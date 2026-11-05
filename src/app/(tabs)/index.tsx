import { StyleSheet, View } from 'react-native';

import { fromLocalDate } from '@/db';
import { TapGrid } from '@/features/communication/tap-grid';
import { useLocalDay } from '@/features/communication/use-local-day';
import { AppText } from '@/ui/app-text';
import { formatDate } from '@/ui/format';
import { colors, spacing } from '@/ui/theme';
import { strings } from '@/ui/strings';

export default function Today() {
  // Follows local midnight, so the screen rolls over to the new day while the app stays open.
  const day = useLocalDay();

  return (
    <View style={styles.container}>
      <AppText accessibilityRole="header" variant="heading" style={styles.title}>
        {strings.tabs.today}
      </AppText>
      <AppText color="textMuted" style={styles.title}>
        {formatDate(fromLocalDate(day))}
      </AppText>
      <TapGrid day={day} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    textAlign: 'center',
  },
});
