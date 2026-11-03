import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';

import { DATABASE_NAME, initDatabase } from '@/db';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <Stack />
    </SQLiteProvider>
  );
}
