import { StyleSheet, Text, View } from 'react-native';

import { UpdateCheck } from '@/features/update-check/update-check';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Petits Pas</Text>
      <UpdateCheck />
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
