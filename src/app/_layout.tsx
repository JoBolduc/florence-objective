import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';

import { DATABASE_NAME, initDatabase } from '@/db';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SQLiteProvider>
  );
}
