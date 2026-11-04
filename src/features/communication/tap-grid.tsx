import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { CommunicationTypeRecord } from '@/db';
import { AppText } from '@/ui/app-text';
import { strings } from '@/ui/strings';
import { colors, radii, spacing } from '@/ui/theme';

import { Celebration } from './celebration';
import { DailyCounter } from './daily-counter';
import { useTapGrid } from './use-tap-grid';

const TILE_MIN_HEIGHT = 128;

function Tile({ type, onPress }: { type: CommunicationTypeRecord; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.today.logType(type.label)}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <AppText variant="display" style={styles.icon}>
        {type.icon}
      </AppText>
      <AppText variant="label">{type.label}</AppText>
    </Pressable>
  );
}

export function TapGrid() {
  const { types, status, count, saveFailed, celebrating, endCelebration, log } = useTapGrid();

  if (status === 'loading') return <AppText color="textMuted">{strings.today.loading}</AppText>;
  if (status === 'loadFailed') return <AppText color="danger">{strings.today.loadFailed}</AppText>;

  return (
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
          <Tile key={type.id} type={type} onPress={() => log(type.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.md,
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
  icon: {
    textAlign: 'center',
  },
});
