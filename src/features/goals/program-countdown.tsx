import { fromLocalDate } from '@/db';
import { AppText } from '@/ui/app-text';
import { formatDate } from '@/ui/format';
import { strings } from '@/ui/strings';

import { useGoalSettings } from './goal-settings-provider';
import { programProgress } from './program-progress';

/** "Semaine 6 sur 17" for the day shown, or the start / end of the program. */
export function ProgramCountdown({ day }: { day: string }) {
  const { settings } = useGoalSettings();
  const progress = programProgress(settings.programStart, settings.programEnd, day);
  const text =
    progress.phase === 'running'
      ? strings.countdown.week(progress.week, progress.weeks)
      : progress.phase === 'upcoming'
        ? strings.countdown.upcoming(formatDate(fromLocalDate(progress.start)))
        : strings.countdown.finished(progress.weeks);

  return (
    <AppText color="textMuted" style={{ textAlign: 'center' }}>
      {text}
    </AppText>
  );
}
