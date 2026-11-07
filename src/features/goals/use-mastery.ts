import { useEffect, useMemo, useState } from 'react';

import { useRepositories } from '@/db';

import { useGoalSettings } from './goal-settings-provider';
import { masteryByType, windowStart, type MasteryStatus } from './mastery';

export interface MasteryRow {
  typeId: string;
  status: MasteryStatus;
  days: number;
}

/**
 * Status per communication type for the window ending on `day`. `refreshOn` is any value
 * that changes when events do (today's events): the colors follow logging, edits, undo
 * and sync without storing anything.
 */
export function useMastery(day: string, refreshOn: unknown) {
  const { children, communicationTypes, events } = useRepositories();
  const { settings } = useGoalSettings();
  const { windowDays, greenDays, yellowDays } = settings.mastery;
  const [rows, setRows] = useState<MasteryRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [child] = await children.list();
      if (!child) return;
      const [types, active] = await Promise.all([
        communicationTypes.list(),
        events.activeDays(child.id, windowStart(day, windowDays), day),
      ]);
      const result = masteryByType(
        types.map((t) => t.id),
        active,
        { windowDays, greenDays, yellowDays },
      );
      if (!cancelled) {
        setRows(types.filter((t) => result[t.id]).map((t) => ({ typeId: t.id, ...result[t.id] })));
      }
    })().catch(() => {
      // The colors are a bonus: logging keeps working without them.
    });
    return () => {
      cancelled = true;
    };
    // `refreshOn` is a trigger, not an input of the computation.
  }, [children, communicationTypes, events, day, windowDays, greenDays, yellowDays, refreshOn]);

  const byId = useMemo(
    () =>
      Object.fromEntries(rows.map((r) => [r.typeId, r.status])) as Record<string, MasteryStatus>,
    [rows],
  );
  return { rows, byId };
}
