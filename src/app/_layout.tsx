import { type ErrorBoundaryProps, Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';

import { DATABASE_NAME, initDatabase } from '@/db';
import { SessionProvider } from '@/features/account/session';
import { SyncProvider } from '@/features/sync/sync-provider';
import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { CenteredScreen } from '@/ui/centered-screen';
import { strings } from '@/ui/strings';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <CenteredScreen title={strings.error.title}>
      <AppText>{strings.error.message}</AppText>
      <Button label={strings.error.retry} onPress={retry} />
    </CenteredScreen>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <SessionProvider>
        <SyncProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" options={{ headerShown: false }} />
          </Stack>
        </SyncProvider>
      </SessionProvider>
    </SQLiteProvider>
  );
}
