import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function PlaceholderScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
});
