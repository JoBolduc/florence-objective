import * as Application from 'expo-application';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useUpdateCheckRepository } from '@/db';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { formatTime } from '@/ui/format';
import { strings } from '@/ui/strings';
import { spacing } from '@/ui/theme';

/** Temporary (E0-S2): remove with E1-S2. See `src/db/update-check.ts`. */
export function UpdateCheck() {
  const repository = useUpdateCheckRepository();
  const [count, setCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [openedAt] = useState(() => new Date());

  useEffect(() => {
    repository
      .read()
      .then(setCount)
      .catch(() => setFailed(true));
  }, [repository]);

  const increment = () => {
    repository
      .increment()
      .then((next) => {
        setCount(next);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  };

  return (
    <View style={styles.container}>
      <AppText variant="label">{strings.updateCheck.title}</AppText>
      <AppText>{strings.updateCheck.buildVersion(Application.nativeBuildVersion)}</AppText>
      <AppText>{strings.updateCheck.openedAt(formatTime(openedAt))}</AppText>
      <AppText variant="display">{count ?? strings.updateCheck.loading}</AppText>
      {failed && <AppText color="danger">{strings.updateCheck.failed}</AppText>}
      <Button
        label={strings.updateCheck.increment}
        accessibilityLabel={strings.updateCheck.incrementLabel}
        onPress={increment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});
