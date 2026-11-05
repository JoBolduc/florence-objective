import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { msUntilNextMidnight, toLocalDate } from '@/db';

/**
 * Today's local date (YYYY-MM-DD). It changes by itself at local midnight, and is
 * rechecked when the app returns to the foreground, since timers can be paused or
 * the clock changed while the phone slept.
 */
export function useLocalDay(): string {
  const [day, setDay] = useState(() => toLocalDate(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date();
      setDay(toLocalDate(now));
      // +1 s so the timer lands just after midnight, never just before.
      timer = setTimeout(refresh, msUntilNextMidnight(now) + 1000);
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return day;
}
