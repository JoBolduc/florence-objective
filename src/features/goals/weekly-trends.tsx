import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { addDays, fromLocalDate } from '@/db';
import { AppText } from '@/ui/app-text';
import { formatDayMonth, formatNumber, formatPercent } from '@/ui/format';
import { strings } from '@/ui/strings';
import { colors, radii, spacing } from '@/ui/theme';

import { useGoalSettings } from './goal-settings-provider';
import { useProgramCounts } from './use-program-counts';
import { totalsByDay, weeklyStats } from './weekly';

/** Whole program so far, one row per week: average signs a day and share of days at target. */
export function WeeklyTrends() {
  const counts = useProgramCounts();
  const { settings } = useGoalSettings();

  const weeks = useMemo(() => {
    if (counts.status !== 'ready') return [];
    return weeklyStats(
      totalsByDay(counts.rows),
      settings.programStart,
      counts.lastDay,
      settings.dailyTargetOn,
    );
  }, [counts, settings]);

  // Bars share one scale: the best week, or the current target if nobody got there.
  const scale = Math.max(
    1,
    ...weeks.map((w) => w.average),
    settings.dailyTargetOn(counts.status === 'ready' ? counts.lastDay : settings.programStart),
  );

  return (
    <View style={styles.section}>
      <AppText accessibilityRole="header" variant="label">
        {strings.trends.title}
      </AppText>
      <AppText color="textMuted">{strings.trends.hint}</AppText>
      {counts.status === 'failed' ? (
        <AppText color="danger">{strings.trends.loadFailed}</AppText>
      ) : null}
      {counts.status === 'ready' && weeks.length === 0 ? (
        <AppText color="textMuted">{strings.trends.empty}</AppText>
      ) : null}
      {[...weeks].reverse().map((week) => {
        const from = week.start < settings.programStart ? settings.programStart : week.start;
        const range = strings.trends.range(
          formatDayMonth(fromLocalDate(from)),
          formatDayMonth(fromLocalDate(addDays(week.start, 6))),
        );
        const average = strings.trends.average(formatNumber(week.average));
        const atTarget = strings.trends.atTarget(
          formatPercent(week.shareAtTarget),
          week.daysAtTarget,
          week.days,
        );
        const weekLabel = strings.trends.week(week.number);
        return (
          <View
            accessible
            accessibilityLabel={strings.trends.row(weekLabel, range, average, atTarget)}
            key={week.start}
            style={styles.row}
          >
            <View style={styles.head}>
              <AppText variant="label">{weekLabel}</AppText>
              <AppText color="textMuted">{range}</AppText>
            </View>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${(week.average / scale) * 100}%` }]} />
            </View>
            <AppText>{average}</AppText>
            <AppText color="textMuted">{atTarget}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: { gap: spacing.xs, paddingVertical: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  track: {
    height: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  bar: { height: 14, borderRadius: radii.md, backgroundColor: colors.primary },
});
