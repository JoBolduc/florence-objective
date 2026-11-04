import { UpdateCheck } from '@/features/update-check/update-check';
import { PlaceholderScreen } from '@/ui/placeholder-screen';
import { strings } from '@/ui/strings';

export default function Settings() {
  return (
    <PlaceholderScreen title={strings.tabs.settings}>
      <UpdateCheck />
    </PlaceholderScreen>
  );
}
