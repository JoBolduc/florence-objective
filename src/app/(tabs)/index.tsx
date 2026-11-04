import { useState } from 'react';

import { AppText } from '@/ui/app-text';
import { CenteredScreen } from '@/ui/centered-screen';
import { formatDate } from '@/ui/format';
import { strings } from '@/ui/strings';

export default function Today() {
  // Fixed once the screen opens: E1-S8 handles the app staying open past midnight.
  const [today] = useState(() => new Date());

  return (
    <CenteredScreen title={strings.tabs.today}>
      <AppText color="textMuted">{formatDate(today)}</AppText>
    </CenteredScreen>
  );
}
