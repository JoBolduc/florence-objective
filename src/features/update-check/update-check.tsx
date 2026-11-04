import * as Application from 'expo-application';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useUpdateCheckRepository } from '@/db';

/** Temporary (E0-S2): remove with E1-S2. See `src/db/update-check.ts`. */
export function UpdateCheck() {
  const repository = useUpdateCheckRepository();
  const [count, setCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

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
      <Text style={styles.label}>Test de mise à jour</Text>
      <Text>Version de build : {Application.nativeBuildVersion ?? '?'}</Text>
      <Text style={styles.count}>{count ?? '…'}</Text>
      {failed && <Text>Impossible d’accéder au compteur.</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ajouter 1 au compteur"
        onPress={increment}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>+1</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '600',
  },
  count: {
    fontSize: 40,
    fontWeight: '700',
  },
  button: {
    minWidth: 96,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#208AEF',
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
