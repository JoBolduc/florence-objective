import { ScrollView, StyleSheet } from 'react-native';

import { MasteryList } from '@/features/goals/mastery-list';
import { AppText } from '@/ui/app-text';
import { strings } from '@/ui/strings';
import { colors, spacing } from '@/ui/theme';

export default function History() {
  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
      <AppText accessibilityRole="header" variant="heading">
        {strings.tabs.history}
      </AppText>
      <MasteryList />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
