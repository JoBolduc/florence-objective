import { Pressable, StyleSheet, View } from 'react-native';

import type { CommunicationTypeRecord, EventRecord } from '@/db';
import { AppText } from '@/ui/app-text';
import { formatTime } from '@/ui/format';
import { strings } from '@/ui/strings';
import { colors, radii, spacing } from '@/ui/theme';

/** Today's events, newest first, as the use-tap-grid hook returns them. */
export function Timeline({
  events,
  types,
  onSelect,
}: {
  events: EventRecord[];
  types: CommunicationTypeRecord[];
  onSelect: (event: EventRecord) => void;
}) {
  const typeById = new Map(types.map((t) => [t.id, t]));

  return (
    <View style={styles.section}>
      <AppText accessibilityRole="header" variant="label">
        {strings.today.timelineTitle}
      </AppText>
      {events.length === 0 && <AppText color="textMuted">{strings.today.timelineEmpty}</AppText>}
      {events.map((event) => {
        const type = typeById.get(event.typeId);
        return (
          <Pressable
            key={event.id}
            accessibilityRole="button"
            accessibilityLabel={strings.today.openEvent(type?.label ?? event.typeId)}
            onPress={() => onSelect(event)}
            style={styles.row}
          >
            <AppText color="textMuted">{formatTime(new Date(event.occurredAt))}</AppText>
            <AppText variant="label">{type?.icon ?? strings.today.unknownIcon}</AppText>
            <View style={styles.text}>
              <AppText variant="label">{type?.label ?? event.typeId}</AppText>
              {!event.counts && (
                <AppText variant="caption" color="textMuted">
                  {strings.today.notCounted}
                </AppText>
              )}
              {event.note ? (
                <AppText color="textMuted" numberOfLines={1}>
                  {event.note}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  text: {
    flex: 1,
  },
});
