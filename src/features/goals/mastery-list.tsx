import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { toLocalDate, useRepositories } from '@/db';
import { AppText } from '@/ui/app-text';
import { strings } from '@/ui/strings';
import { spacing } from '@/ui/theme';

import { useGoalSettings } from './goal-settings-provider';
import { MasteryMarker } from './mastery-marker';
import { useMastery } from './use-mastery';

/** Every sign with its status and the days it was seen in the window. */
export function MasteryList() {
  const { communicationTypes } = useRepositories();
  const { settings } = useGoalSettings();
  const [labels, setLabels] = useState<Record<string, string>>({});
  const { rows } = useMastery(toLocalDate(new Date()), null);
  const windowDays = settings.mastery.windowDays;

  useEffect(() => {
    communicationTypes
      .list()
      .then((types) =>
        setLabels(Object.fromEntries(types.map((t) => [t.id, `${t.icon} ${t.label}`]))),
      )
      .catch(() => {});
  }, [communicationTypes]);

  return (
    <View style={styles.list}>
      <AppText accessibilityRole="header" variant="label">
        {strings.mastery.title}
      </AppText>
      <AppText color="textMuted">{strings.mastery.hint}</AppText>
      {rows.map((row) => {
        const name = labels[row.typeId] ?? row.typeId;
        const days = strings.mastery.daysOf(row.days, windowDays);
        return (
          <View
            accessible
            accessibilityLabel={strings.mastery.row(name, strings.mastery[row.status], days)}
            key={row.typeId}
            style={styles.row}
          >
            <AppText style={styles.name}>{name}</AppText>
            <AppText color="textMuted">{days}</AppText>
            <MasteryMarker status={row.status} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  name: { flex: 1 },
});
