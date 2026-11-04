import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TapGrid } from '@/features/communication/tap-grid';
import { AppText } from '@/ui/app-text';
import { formatDate } from '@/ui/format';
import { colors, spacing } from '@/ui/theme';
import { strings } from '@/ui/strings';

export default function Today() {
  // Fixed once the screen opens: E1-S8 handles the app staying open past midnight.
  const [today] = useState(() => new Date());

  return (
    <View style={styles.container}>
      <AppText accessibilityRole="header" variant="heading" style={styles.title}>
        {strings.tabs.today}
      </AppText>
      <AppText color="textMuted" style={styles.title}>
        {formatDate(today)}
      </AppText>
      <TapGrid />
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
