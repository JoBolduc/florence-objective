import { useMemo } from 'react';

import { AppText } from '@/ui/app-text';
import { formatNumber } from '@/ui/format';
import { strings } from '@/ui/strings';

import { useGoalSettings } from './goal-settings-provider';
import { useProgramCounts } from './use-program-counts';
import { totalsByDay, weeklyStats, weekStartOf } from './weekly';

/**
 * This week's communication in one line, under today's ring. `refreshOn` changes when
 * today's events do, so the line follows each tap. Attention and games join it with E3 / E4.
 */
export function WeekSummary({ day, refreshOn }: { day: string; refreshOn: unknown }) {
  const { settings } = useGoalSettings();
  const counts = useProgramCounts(refreshOn);

  const week = useMemo(() => {
    if (counts.status !== 'ready') return null;
    const stats = weeklyStats(
      totalsByDay(counts.rows),
      settings.programStart,
      counts.lastDay,
      settings.dailyTargetOn,
    );
    return stats.find((w) => w.start === weekStartOf(day)) ?? null;
  }, [counts, settings, day]);

  if (!week) return null;
  return (
    <AppText accessibilityLiveRegion="polite" color="textMuted" style={{ textAlign: 'center' }}>
      {strings.countdown.weekSummary(formatNumber(week.average), week.daysAtTarget, week.days)}
    </AppText>
  );
}
