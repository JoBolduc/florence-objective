import { UpdateCheck } from '@/features/update-check/update-check';
import { CenteredScreen } from '@/ui/centered-screen';
import { strings } from '@/ui/strings';

export default function Settings() {
  return (
    <CenteredScreen title={strings.tabs.settings}>
      <UpdateCheck />
    </CenteredScreen>
  );
}
