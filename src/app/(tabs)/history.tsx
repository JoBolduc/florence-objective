import { ScrollView, StyleSheet } from 'react-native';

import { HistoryCalendar } from '@/features/goals/history-calendar';
import { MasteryList } from '@/features/goals/mastery-list';
import { WeeklyTrends } from '@/features/goals/weekly-trends';
import { AppText } from '@/ui/app-text';
import { strings } from '@/ui/strings';
import { colors, spacing } from '@/ui/theme';

export default function History() {
  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
      <AppText accessibilityRole="header" variant="heading">
        {strings.tabs.history}
      </AppText>
      <HistoryCalendar />
      <WeeklyTrends />
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
