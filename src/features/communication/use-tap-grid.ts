import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toLocalDate, useRepositories, type CommunicationTypeRecord, type EventRecord } from '@/db';

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
  // Today's live events, newest first. The counter, badges and timeline all derive from it.
  const [todayEvents, setTodayEvents] = useState<EventRecord[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [saveFailed, setSaveFailed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  // The event the snackbar offers to undo. A new tap replaces it.
  const [undoable, setUndoable] = useState<{ eventId: string; typeId: string } | null>(null);

  // The day shown by the screen. E1-S8 handles the app staying open past midnight.
  const [day] = useState(() => toLocalDate(new Date()));
  // Latest events, readable inside async callbacks. The celebration flag is in memory
  // only: reopening the app on a day already celebrated and undoing back to 9 could
  // celebrate again.
  const eventsRef = useRef<EventRecord[]>([]);
  const celebratedDay = useRef<string | null>(null);

  const applyEvents = useCallback((list: EventRecord[]) => {
    eventsRef.current = list;
    setTodayEvents(list);
  }, []);

  /** Reloads today's events from the database: counts, badges and timeline follow. */
  const reload = useCallback(
    async (forChildId: string) => {
      applyEvents(await events.listByDay(forChildId, day));
    },
    [events, day, applyEvents],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const child = await children.getOrCreateFirst(DEFAULT_CHILD_NAME);
      const [loadedTypes, list] = await Promise.all([
        communicationTypes.list(),
        events.listByDay(child.id, day),
      ]);
      if (cancelled) return;
      // Today already reached the target before this launch: nothing to celebrate.
      if (list.length >= DAILY_TARGET) celebratedDay.current = day;
      applyEvents(list);
      setTypes(loadedTypes);
      setChildId(child.id);
      setStatus('ready');
    })().catch(() => {
      if (!cancelled) setStatus('loadFailed');
    });
    return () => {
      cancelled = true;
    };
  }, [children, communicationTypes, events, day, applyEvents]);

  /** One tap = one event. Haptics fire first so feedback never waits on the database. */
  const log = useCallback(
    async (typeId: string): Promise<EventRecord | null> => {
      if (!childId) return null;
      buzz(Haptics.AndroidHaptics.Virtual_Key);
      try {
        const event = await events.insert({ childId, typeId });
        setSaveFailed(false);
        if (event.localDate !== day) return event;
        applyEvents([event, ...eventsRef.current]);
        setUndoable({ eventId: event.id, typeId });
        if (eventsRef.current.length >= DAILY_TARGET && celebratedDay.current !== day) {
          celebratedDay.current = day;
          setCelebrating(true);
          buzz(Haptics.AndroidHaptics.Confirm);
        }
        return event;
      } catch {
        setSaveFailed(true);
        return null;
      }
    },
    [childId, events, day, applyEvents],
  );

  /** Sets or clears (null) an event's note. */
  const saveNote = useCallback(
    async (eventId: string, note: string | null) => {
      if (!childId) return;
      try {
        await events.update(eventId, { note });
        await reload(childId);
      } catch {
        setSaveFailed(true);
      }
    },
    [childId, events, reload],
  );

  const endCelebration = useCallback(() => setCelebrating(false), []);

  const dismissUndo = useCallback(() => setUndoable(null), []);

  /** Removes the last logged event (soft delete) and reloads the events. */
  const undo = useCallback(async () => {
    if (!undoable || !childId) return;
    setUndoable(null);
    try {
      await events.softDelete(undoable.eventId);
      await reload(childId);
    } catch {
      setSaveFailed(true);
    }
  }, [undoable, childId, events, reload]);

  const count = todayEvents.length;
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const event of todayEvents) counts[event.typeId] = (counts[event.typeId] ?? 0) + 1;
    return counts;
  }, [todayEvents]);

  return {
    types,
    status,
    count,
    typeCounts,
    todayEvents,
    saveFailed,
    celebrating,
    endCelebration,
    log,
    saveNote,
    undoable,
    undo,
    dismissUndo,
  };
}
