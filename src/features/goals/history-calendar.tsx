import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fromLocalDate, toLocalDate, useRepositories } from '@/db';
import type { CommunicationTypeRecord, EventRecord } from '@/db';
import { Timeline } from '@/features/communication/timeline';
import { useSync } from '@/features/sync/sync-provider';
import { AppText } from '@/ui/app-text';
import { formatDate, formatMonth } from '@/ui/format';
import { strings } from '@/ui/strings';
import { colors, minTouchTarget, radii, spacing } from '@/ui/theme';

import { dayLevel, monthCells, monthKey, monthRange, shiftMonth, type DayLevel } from './calendar';
import { useGoalSettings } from './goal-settings-provider';

const TONE: Record<DayLevel, { bg: string; fg: string }> = {
  reached: { bg: colors.masteryGreenSoft, fg: colors.masteryGreen },
  below: { bg: colors.masteryYellowSoft, fg: colors.masteryYellow },
  empty: { bg: colors.surface, fg: colors.textMuted },
};
const LEVEL_LABEL: Record<DayLevel, string> = {
  reached: strings.calendar.levelReached,
  below: strings.calendar.levelBelow,
  empty: strings.calendar.levelEmpty,
};

/** Month view: each day colored by its counted signs against that day's target. */
export function HistoryCalendar() {
  const { children, communicationTypes, events, dayNotes } = useRepositories();
  const { settings } = useGoalSettings();
  const { state: syncState, memberInitials } = useSync();
  const today = toLocalDate(new Date());
  const [month, setMonth] = useState(monthKey(today));
  const [selected, setSelected] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState(false);
  const [types, setTypes] = useState<CommunicationTypeRecord[]>([]);
  const [dayEvents, setDayEvents] = useState<EventRecord[]>([]);
  const [dayNote, setDayNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [child] = await children.list();
      if (!child) return;
      const { from, to } = monthRange(month);
      const rows = await events.countsByDayRange(child.id, from, to);
      if (!cancelled) {
        setCounts(Object.fromEntries(rows.map((r) => [r.localDate, r.total])));
        setFailed(false);
      }
    })().catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [children, events, month, syncState.revision]);

  useEffect(() => {
    communicationTypes
      .list()
      .then(setTypes)
      .catch(() => {});
  }, [communicationTypes]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      const [child] = await children.list();
      if (!child) return;
      const [list, note] = await Promise.all([
        events.listByDay(child.id, selected),
        dayNotes.getForDay(child.id, selected),
      ]);
      if (!cancelled) {
        setDayEvents(list);
        setDayNote(note?.body ?? null);
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [children, events, dayNotes, selected, syncState.revision]);

  const cells = useMemo(() => monthCells(month), [month]);
  const title = formatMonth(fromLocalDate(`${month}-01`));
  const canGoForward = month < monthKey(today);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.calendar.previousMonth}
          onPress={() => setMonth(shiftMonth(month, -1))}
          style={styles.nav}
        >
          <AppText variant="heading">{strings.calendar.back}</AppText>
        </Pressable>
        <AppText accessibilityRole="header" variant="label" style={styles.title}>
          {title}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.calendar.nextMonth}
          disabled={!canGoForward}
          onPress={() => setMonth(shiftMonth(month, 1))}
          style={[styles.nav, !canGoForward && styles.disabled]}
        >
          <AppText variant="heading">{strings.calendar.forward}</AppText>
        </Pressable>
      </View>

      <View style={styles.week}>
        {strings.calendar.weekdays.map((d, i) => (
          <AppText key={i} color="textMuted" style={styles.weekday}>
            {d}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={`pad-${i}`} style={styles.cell} />;
          const count = counts[date] ?? 0;
          const target = settings.dailyTargetOn(date);
          const level = dayLevel(count, target);
          const future = date > today;
          const tone = TONE[level];
          return (
            <View key={date} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={strings.calendar.cell(
                  formatDate(fromLocalDate(date)),
                  count,
                  target,
                  LEVEL_LABEL[level],
                )}
                accessibilityState={{ selected: selected === date }}
                disabled={future}
                onPress={() => setSelected(selected === date ? null : date)}
                style={[
                  styles.day,
                  { backgroundColor: tone.bg },
                  future && styles.disabled,
                  selected === date && styles.selected,
                ]}
              >
                <AppText variant="caption" style={{ color: tone.fg, fontWeight: '700' }}>
                  {Number(date.slice(8))}
                </AppText>
                {level !== 'empty' ? (
                  <AppText variant="caption" style={{ color: tone.fg }}>
                    {level === 'reached' ? strings.calendar.check : count}
                  </AppText>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <AppText variant="caption" style={{ color: TONE.reached.fg }}>
          {strings.calendar.legendReached}
        </AppText>
        <AppText variant="caption" style={{ color: TONE.below.fg }}>
          {strings.calendar.legendBelow}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {strings.calendar.legendEmpty}
        </AppText>
      </View>
      {failed ? <AppText color="danger">{strings.calendar.loadFailed}</AppText> : null}

      {selected ? (
        <View style={styles.detail}>
          <Timeline
            events={dayEvents}
            types={types}
            memberInitials={memberInitials}
            title={formatDate(fromLocalDate(selected))}
            emptyText={strings.calendar.dayEmpty}
          />
          {dayNote ? (
            <View style={styles.note}>
              <AppText variant="label">{strings.calendar.dayNote}</AppText>
              <AppText>{dayNote}</AppText>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, textAlign: 'center', textTransform: 'capitalize' },
  nav: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.35 },
  week: { flexDirection: 'row' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 0.85, padding: 2 },
  day: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  selected: { borderWidth: 3, borderColor: colors.primary },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  detail: { gap: spacing.md, marginTop: spacing.md },
  note: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
});
