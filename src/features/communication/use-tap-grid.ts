import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

import { toLocalDate, useRepositories, type CommunicationTypeRecord } from '@/db';

import { DAILY_TARGET } from './daily-target';

/** Name given to the tracked child on first launch (E6 adds editing). */
const DEFAULT_CHILD_NAME = 'Florence';

type Status = 'loading' | 'ready' | 'loadFailed';

/** Haptics are a bonus: a failure must never stop an event from being saved. */
function buzz(type: (typeof Haptics.AndroidHaptics)[keyof typeof Haptics.AndroidHaptics]) {
  try {
    Haptics.performAndroidHapticsAsync(type).catch(() => {});
  } catch {
    // ignored on purpose
  }
}

export function useTapGrid() {
  const { children, communicationTypes, events } = useRepositories();
  const [types, setTypes] = useState<CommunicationTypeRecord[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [saveFailed, setSaveFailed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // The day shown by the screen. E1-S8 handles the app staying open past midnight.
  const [day] = useState(() => toLocalDate(new Date()));
  // Latest count, readable inside async callbacks. In memory only: reopening the
  // app on a day already celebrated and undoing back to 9 could celebrate again.
  const countRef = useRef(0);
  const celebratedDay = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const child = await children.getOrCreateFirst(DEFAULT_CHILD_NAME);
      const [loadedTypes, total] = await Promise.all([
        communicationTypes.list(),
        events.countByDay(child.id, day),
      ]);
      if (cancelled) return;
      countRef.current = total;
      // Today already reached the target before this launch: nothing to celebrate.
      if (total >= DAILY_TARGET) celebratedDay.current = day;
      setTypes(loadedTypes);
      setChildId(child.id);
      setCount(total);
      setStatus('ready');
    })().catch(() => {
      if (!cancelled) setStatus('loadFailed');
    });
    return () => {
      cancelled = true;
    };
  }, [children, communicationTypes, events, day]);

  /** One tap = one event. Haptics fire first so feedback never waits on the database. */
  const log = useCallback(
    (typeId: string) => {
      if (!childId) return;
      buzz(Haptics.AndroidHaptics.Virtual_Key);
      events
        .insert({ childId, typeId })
        .then((event) => {
          setSaveFailed(false);
          if (event.localDate !== day) return;
          countRef.current += 1;
          setCount(countRef.current);
          if (countRef.current >= DAILY_TARGET && celebratedDay.current !== day) {
            celebratedDay.current = day;
            setCelebrating(true);
            buzz(Haptics.AndroidHaptics.Confirm);
          }
        })
        .catch(() => setSaveFailed(true));
    },
    [childId, events, day],
  );

  const endCelebration = useCallback(() => setCelebrating(false), []);

  return { types, status, count, saveFailed, celebrating, endCelebration, log };
}
