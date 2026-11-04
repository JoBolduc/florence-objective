import { router } from 'expo-router';

import { AppText } from '@/ui/app-text';
import { Button } from '@/ui/button';
import { CenteredScreen } from '@/ui/centered-screen';
import { strings } from '@/ui/strings';

export default function NotFound() {
  return (
    <CenteredScreen title={strings.notFound.title}>
      <AppText>{strings.notFound.message}</AppText>
      <Button label={strings.notFound.backHome} onPress={() => router.replace('/')} />
    </CenteredScreen>
  );
}
