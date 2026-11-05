import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRepositories, type CommunicationTypeRecord, type EventRecord } from '@/db';
import { useSession } from '@/features/account/session';
import { useSync } from '@/features/sync/sync-provider';

import { DAILY_TARGET } from './daily-target';

/** Name given to the tracked child on first launch (E6 adds editing). */
export const DEFAULT_CHILD_NAME = 'Florence';

type Status = 'loading' | 'ready' | 'loadFailed';

/** Haptics are a bonus: a failure must never stop an event from being saved. */
function buzz(type: (typeof Haptics.AndroidHaptics)[keyof typeof Haptics.AndroidHaptics]) {
  try {
    Haptics.performAndroidHapticsAsync(type).catch(() => {});
  } catch {
    // ignored on purpose
  }
}

/** Events that count toward the daily target (an off-context word does not). */
const countedIn = (list: EventRecord[]) => list.filter((e) => e.counts).length;

/** `day` is the local date being shown (YYYY-MM-DD); a new value reloads the screen for that day. */
export function useTapGrid(day: string) {
  const { children, communicationTypes, events, dayNotes } = useRepositories();
  const { state: syncState, noteWrite, memberInitials } = useSync();
  const session = useSession();
  // Stamped on new rows so the timeline can show who logged them (null while signed out).
  const userId = session.status === 'signedIn' ? session.session.user.id : null;
  // Bumps when a sync brought in the partner's changes: reload what is shown.
  const syncRevision = syncState.revision;
  const [types, setTypes] = useState<CommunicationTypeRecord[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  // Today's live events, newest first. The counter, badges and timeline all derive from it.
  const [todayEvents, setTodayEvents] = useState<EventRecord[]>([]);
  const [dayNote, setDayNote] = useState('');
  // The day the loaded data belongs to; lags `day` until the reload finishes.
  const [loadedDay, setLoadedDay] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [saveFailed, setSaveFailed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  // The event the snackbar offers to undo. A new tap replaces it.
  const [undoable, setUndoable] = useState<{ eventId: string; typeId: string } | null>(null);

  // Latest events, readable inside async callbacks. The celebration flag is in memory
  // only: reopening the app on a day already celebrated and undoing back to 9 could
  // celebrate again.
  const eventsRef = useRef<EventRecord[]>([]);
  const celebratedDay = useRef<string | null>(null);

  const applyEvents = useCallback((list: EventRecord[]) => {
    // A reload and a just-inserted event can both carry the same row: keep one per id,
    // since the id is the React list key.
    const seen = new Set<string>();
    const unique = list.filter((e) => !seen.has(e.id) && seen.add(e.id));
    eventsRef.current = unique;
    setTodayEvents(unique);
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
      const [loadedTypes, list, note] = await Promise.all([
        communicationTypes.list(),
        events.listByDay(child.id, day),
        dayNotes.getForDay(child.id, day),
      ]);
      if (cancelled) return;
      // Today already reached the target before this launch: nothing to celebrate.
      if (countedIn(list) >= DAILY_TARGET) celebratedDay.current = day;
      applyEvents(list);
      setUndoable(null);
      setDayNote(note?.body ?? '');
      setLoadedDay(day);
      setTypes(loadedTypes);
      setChildId(child.id);
      setStatus('ready');
    })().catch(() => {
      if (!cancelled) setStatus('loadFailed');
    });
    return () => {
      cancelled = true;
    };
  }, [children, communicationTypes, events, dayNotes, day, applyEvents, syncRevision]);

  /** One tap = one event. Haptics fire first so feedback never waits on the database. */
  const log = useCallback(
    async (
      typeId: string,
      extra?: { note: string; counts: boolean },
    ): Promise<EventRecord | null> => {
      if (!childId) return null;
      buzz(Haptics.AndroidHaptics.Virtual_Key);
      try {
        const event = await events.insert({ childId, typeId, loggedBy: userId, ...extra });
        noteWrite();
        setSaveFailed(false);
        if (event.localDate !== day) return event;
        applyEvents([event, ...eventsRef.current]);
        setUndoable({ eventId: event.id, typeId });
        if (countedIn(eventsRef.current) >= DAILY_TARGET && celebratedDay.current !== day) {
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
    [childId, events, day, applyEvents, noteWrite, userId],
  );

  /** Saves the edited fields of an event (note, type, time) and reloads the events. */
  const saveEvent = useCallback(
    async (
      eventId: string,
      changes: { typeId: string; occurredAt: Date; note: string | null; counts: boolean },
    ) => {
      if (!childId) return;
      try {
        await events.update(eventId, changes);
        noteWrite();
        await reload(childId);
      } catch {
        setSaveFailed(true);
      }
    },
    [childId, events, reload, noteWrite],
  );

  /** Soft-deletes an event (the row is kept for sync) and reloads the events. */
  const deleteEvent = useCallback(
    async (eventId: string) => {
      if (!childId) return;
      setUndoable((current) => (current?.eventId === eventId ? null : current));
      try {
        await events.softDelete(eventId);
        noteWrite();
        await reload(childId);
      } catch {
        setSaveFailed(true);
      }
    },
    [childId, events, reload, noteWrite],
  );

  const endCelebration = useCallback(() => setCelebrating(false), []);

  const dismissUndo = useCallback(() => setUndoable(null), []);

  /** Removes the last logged event (soft delete) and reloads the events. */
  const undo = useCallback(async () => {
    if (!undoable || !childId) return;
    setUndoable(null);
    try {
      await events.softDelete(undoable.eventId);
      noteWrite();
      await reload(childId);
    } catch {
      setSaveFailed(true);
    }
  }, [undoable, childId, events, reload, noteWrite]);

  /** Saves the day's note; clearing the text removes the note (soft delete). */
  const saveDayNote = useCallback(
    async (body: string) => {
      if (!childId) return;
      try {
        const text = body.trim();
        if (text) {
          await dayNotes.save({ childId, localDate: day, body: text, loggedBy: userId });
        } else {
          const existing = await dayNotes.getForDay(childId, day);
          if (existing) await dayNotes.softDelete(existing.id);
        }
        noteWrite();
      } catch {
        setSaveFailed(true);
      }
    },
    [childId, dayNotes, day, noteWrite, userId],
  );

  const count = countedIn(todayEvents);
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
    memberInitials,
    dayNote,
    loadedDay,
    saveDayNote,
    saveFailed,
    celebrating,
    endCelebration,
    log,
    saveEvent,
    deleteEvent,
    undoable,
    undo,
    dismissUndo,
  };
}
