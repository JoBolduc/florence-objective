import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import type { CommunicationTypeRecord } from '@/db';
import { MasteryMarker } from '@/features/goals/mastery-marker';
import type { MasteryStatus } from '@/features/goals/mastery';
import { useMastery } from '@/features/goals/use-mastery';
import { useSync } from '@/features/sync/sync-provider';
import { AppText } from '@/ui/app-text';
import { strings } from '@/ui/strings';
import { colors, minTouchTarget, radii, spacing } from '@/ui/theme';

import { Celebration } from './celebration';
import { DailyCounter } from './daily-counter';
import { DayNoteField } from './day-note-field';
import { EventSheet } from './event-sheet';
import { Timeline } from './timeline';
import { UndoSnackbar } from './undo-snackbar';
import { useTapGrid } from './use-tap-grid';
import { WordSheet } from './word-sheet';
import { WORD_TYPE_ID } from './word-type';

const TILE_MIN_HEIGHT = 128;

function Tile({
  type,
  count,
  mastery,
  onPress,
  onLongPress,
}: {
  type: CommunicationTypeRecord;
  count: number;
  mastery: MasteryStatus | null;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        mastery
          ? strings.mastery.tile(strings.today.logType(type.label, count), strings.mastery[mastery])
          : strings.today.logType(type.label, count)
      }
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <AppText variant="display" style={styles.icon}>
        {type.icon}
      </AppText>
      <AppText variant="label">{type.label}</AppText>
      {mastery ? <MasteryMarker status={mastery} /> : null}
      {count > 0 && (
        <View style={styles.badge}>
          <AppText variant="caption" color="onPrimary" style={styles.badgeText}>
            {count}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

export function TapGrid({ day }: { day: string }) {
  const {
    types,
    status,
    count,
    target,
    typeCounts,
    todayEvents,
    memberInitials,
    dayNote,
    loadedDay,
    saveDayNote,
    saveFailed,
    celebrating,
    endCelebration,
    log,
    saveEvent,
    deleteEvent,
    undoable,
    undo,
    dismissUndo,
  } = useTapGrid(day);
  // The event whose sheet is open (note, type, time, deletion).
  const [sheet, setSheet] = useState<{ id: string; focusNote: boolean } | null>(null);
  // The "which word?" sheet, opened by the Mot tile instead of logging straight away.
  const [wordSheetOpen, setWordSheetOpen] = useState(false);
  const { byId: mastery } = useMastery(day, todayEvents);
  const { enabled: syncEnabled, state: syncState, syncNow } = useSync();

  if (status === 'loading') return <AppText color="textMuted">{strings.today.loading}</AppText>;
  if (status === 'loadFailed') return <AppText color="danger">{strings.today.loadFailed}</AppText>;

  const sheetEvent = todayEvents.find((e) => e.id === sheet?.id);
  const undoLabel = types.find((t) => t.id === undoable?.typeId)?.label ?? '';

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          syncEnabled ? (
            <RefreshControl refreshing={syncState.status === 'syncing'} onRefresh={syncNow} />
          ) : undefined
        }
      >
        <DailyCounter count={count} target={target} />
        {celebrating && <Celebration target={target} onDone={endCelebration} />}
        <AppText color="textMuted" style={styles.reminder}>
          {strings.today.reminder}
        </AppText>
        {saveFailed && (
          <AppText color="danger" accessibilityLiveRegion="polite">
            {strings.today.saveFailed}
          </AppText>
        )}
        <View style={styles.grid}>
          {types.map((type) => (
            <Tile
              key={type.id}
              type={type}
              count={typeCounts[type.id] ?? 0}
              mastery={mastery[type.id] ?? null}
              onPress={() => (type.id === WORD_TYPE_ID ? setWordSheetOpen(true) : log(type.id))}
              onLongPress={() => {
                if (type.id === WORD_TYPE_ID) {
                  setWordSheetOpen(true);
                  return;
                }
                // Logs exactly one event, then offers to describe it.
                log(type.id).then((event) => event && setSheet({ id: event.id, focusNote: true }));
              }}
            />
          ))}
        </View>
        <DayNoteField key={loadedDay} initialBody={dayNote} onSave={saveDayNote} />
        <Timeline
          events={todayEvents}
          types={types}
          memberInitials={memberInitials}
          onSelect={(event) => setSheet({ id: event.id, focusNote: false })}
        />
      </ScrollView>
      {sheetEvent && (
        <EventSheet
          key={sheetEvent.id}
          event={sheetEvent}
          types={types}
          focusNote={sheet?.focusNote ?? false}
          onSave={(changes) => {
            saveEvent(sheetEvent.id, changes);
            setSheet(null);
          }}
          onDelete={() => {
            deleteEvent(sheetEvent.id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {wordSheetOpen && (
        <WordSheet
          onSubmit={(word, counts) => {
            setWordSheetOpen(false);
            log(WORD_TYPE_ID, { note: word, counts });
          }}
          onClose={() => setWordSheetOpen(false)}
        />
      )}
      {undoable && (
        <UndoSnackbar
          key={undoable.eventId}
          message={strings.today.logged(undoLabel)}
          onUndo={undo}
          onExpire={dismissUndo}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    // Room to scroll the last timeline rows clear of the undo snackbar.
    paddingBottom: 2 * minTouchTarget,
  },
  reminder: {
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: TILE_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  tilePressed: {
    backgroundColor: colors.primarySoft,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minWidth: 28,
    height: 28,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontWeight: '700',
    lineHeight: 22,
  },
  icon: {
    textAlign: 'center',
  },
});
