import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { addDays, fromLocalDate, useRepositories } from '@/db';
import { AppText } from '@/ui/app-text';
import { formatDayMonth, formatPercent } from '@/ui/format';
import { strings } from '@/ui/strings';
import { colors, minTouchTarget, radii, spacing } from '@/ui/theme';

import { useGoalSettings } from './goal-settings-provider';
import { useProgramCounts } from './use-program-counts';
import { weekBreakdown, weekNumber, weekStartOf } from './weekly';

/** Share of each communication type in one week; the type totals add up to the week's total. */
export function TypeBreakdown() {
  const { communicationTypes } = useRepositories();
  const { settings } = useGoalSettings();
  const counts = useProgramCounts();
  const [labels, setLabels] = useState<Record<string, string>>({});
  // null follows the current week; a value is a Monday the parent navigated to.
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    communicationTypes
      .list()
      .then((types) =>
        setLabels(Object.fromEntries(types.map((t) => [t.id, `${t.icon} ${t.label}`]))),
      )
      .catch(() => {});
  }, [communicationTypes]);

  const firstWeek = weekStartOf(settings.programStart);
  const lastWeek = weekStartOf(counts.status === 'ready' ? counts.lastDay : settings.programStart);
  const week = picked && picked >= firstWeek && picked <= lastWeek ? picked : lastWeek;

  const shares = useMemo(
    () => (counts.status === 'ready' ? weekBreakdown(counts.rows, week) : []),
    [counts, week],
  );
  const total = shares.reduce((n, s) => n + s.total, 0);
  const weekLabel = strings.trends.week(weekNumber(settings.programStart, week));
  const range = strings.trends.range(
    formatDayMonth(fromLocalDate(week)),
    formatDayMonth(fromLocalDate(addDays(week, 6))),
  );

  return (
    <View style={styles.section}>
      <AppText accessibilityRole="header" variant="label">
        {strings.breakdown.title}
      </AppText>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.breakdown.previousWeek}
          disabled={week <= firstWeek}
          onPress={() => setPicked(addDays(week, -7))}
          style={[styles.nav, week <= firstWeek && styles.disabled]}
        >
          <AppText variant="heading">{strings.calendar.back}</AppText>
        </Pressable>
        <AppText style={styles.title}>{strings.breakdown.weekTitle(weekLabel, range)}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.breakdown.nextWeek}
          disabled={week >= lastWeek}
          onPress={() => setPicked(addDays(week, 7))}
          style={[styles.nav, week >= lastWeek && styles.disabled]}
        >
          <AppText variant="heading">{strings.calendar.forward}</AppText>
        </Pressable>
      </View>
      {counts.status === 'failed' ? (
        <AppText color="danger">{strings.trends.loadFailed}</AppText>
      ) : null}
      {counts.status === 'ready' && shares.length === 0 ? (
        <AppText color="textMuted">{strings.breakdown.empty}</AppText>
      ) : null}
      {shares.map((s) => {
        const name = labels[s.typeId] ?? s.typeId;
        const percent = formatPercent(s.share);
        return (
          <View
            accessible
            accessibilityLabel={strings.breakdown.row(name, s.total, percent)}
            key={s.typeId}
            style={styles.row}
          >
            <View style={styles.head}>
              <AppText style={styles.name}>{name}</AppText>
              <AppText>{strings.breakdown.count(s.total, percent)}</AppText>
            </View>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${s.share * 100}%` }]} />
            </View>
          </View>
        );
      })}
      {shares.length > 0 ? (
        <AppText variant="label">{strings.breakdown.total(total)}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, textAlign: 'center' },
  nav: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.35 },
  row: { gap: spacing.xs, paddingVertical: spacing.xs },
  head: { flexDirection: 'row', gap: spacing.sm },
  name: { flex: 1 },
  track: {
    height: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  bar: { height: 12, borderRadius: radii.md, backgroundColor: colors.primary },
});
