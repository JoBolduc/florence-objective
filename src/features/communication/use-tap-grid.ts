import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';

import { useRepositories, type CommunicationTypeRecord } from '@/db';

/** Name given to the tracked child on first launch (E6 adds editing). */
const DEFAULT_CHILD_NAME = 'Florence';

type Status = 'loading' | 'ready' | 'loadFailed';

export function useTapGrid() {
  const { children, communicationTypes, events } = useRepositories();
  const [types, setTypes] = useState<CommunicationTypeRecord[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([communicationTypes.list(), children.getOrCreateFirst(DEFAULT_CHILD_NAME)])
      .then(([loadedTypes, child]) => {
        if (cancelled) return;
        setTypes(loadedTypes);
        setChildId(child.id);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('loadFailed');
      });
    return () => {
      cancelled = true;
    };
  }, [children, communicationTypes]);

  /** One tap = one event. Haptics fire first so feedback never waits on the database. */
  const log = useCallback(
    (typeId: string) => {
      if (!childId) return;
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key).catch(() => {});
      events
        .insert({ childId, typeId })
        .then(() => setSaveFailed(false))
        .catch(() => setSaveFailed(true));
    },
    [childId, events],
  );

  return { types, status, saveFailed, log };
}
