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
  memberInitials,
  onSelect,
  title = strings.today.timelineTitle,
  emptyText = strings.today.timelineEmpty,
}: {
  events: EventRecord[];
  types: CommunicationTypeRecord[];
  /** Initials by user id; events from before sign-in have no author. */
  memberInitials: Record<string, string>;
  onSelect?: (event: EventRecord) => void;
  title?: string;
  emptyText?: string;
}) {
  const typeById = new Map(types.map((t) => [t.id, t]));

  return (
    <View style={styles.section}>
      <AppText accessibilityRole="header" variant="label">
        {title}
      </AppText>
      {events.length === 0 && <AppText color="textMuted">{emptyText}</AppText>}
      {events.map((event) => {
        const type = typeById.get(event.typeId);
        const initials = event.loggedBy
          ? (memberInitials[event.loggedBy] ?? strings.today.unknownAuthor)
          : null;
        return (
          <Pressable
            key={event.id}
            accessibilityRole={onSelect ? 'button' : undefined}
            accessibilityLabel={strings.today.openEvent(type?.label ?? event.typeId, initials)}
            disabled={!onSelect}
            onPress={() => onSelect?.(event)}
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
            {initials ? (
              <View style={styles.author}>
                <AppText variant="caption" color="onPrimary" style={styles.authorText}>
                  {initials}
                </AppText>
              </View>
            ) : null}
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
  author: {
    minWidth: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  authorText: {
    fontWeight: '700',
  },
});
