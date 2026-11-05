import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { CommunicationTypeRecord } from '@/db';
import { AppText } from '@/ui/app-text';
import { strings } from '@/ui/strings';
import { colors, minTouchTarget, radii, spacing } from '@/ui/theme';

import { Celebration } from './celebration';
import { DailyCounter } from './daily-counter';
import { Timeline } from './timeline';
import { UndoSnackbar } from './undo-snackbar';
import { useTapGrid } from './use-tap-grid';

const TILE_MIN_HEIGHT = 128;

function Tile({
  type,
  count,
  onPress,
}: {
  type: CommunicationTypeRecord;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.today.logType(type.label, count)}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <AppText variant="display" style={styles.icon}>
        {type.icon}
      </AppText>
      <AppText variant="label">{type.label}</AppText>
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

export function TapGrid() {
  const {
    types,
    status,
    count,
    typeCounts,
    todayEvents,
    saveFailed,
    celebrating,
    endCelebration,
    log,
    undoable,
    undo,
    dismissUndo,
  } = useTapGrid();

  if (status === 'loading') return <AppText color="textMuted">{strings.today.loading}</AppText>;
  if (status === 'loadFailed') return <AppText color="danger">{strings.today.loadFailed}</AppText>;

  const undoLabel = types.find((t) => t.id === undoable?.typeId)?.label ?? '';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <DailyCounter count={count} />
        {celebrating && <Celebration onDone={endCelebration} />}
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
              onPress={() => log(type.id)}
            />
          ))}
        </View>
        <Timeline events={todayEvents} types={types} />
      </ScrollView>
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
