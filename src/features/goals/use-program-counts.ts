import { useEffect, useState } from 'react';

import { toLocalDate, useRepositories } from '@/db';
import { useSync } from '@/features/sync/sync-provider';

import { useGoalSettings } from './goal-settings-provider';
import type { TypeDayCount } from './weekly';

type State =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; rows: TypeDayCount[]; lastDay: string };

/**
 * Counted signs per type and day from the program start to today (or the program end),
 * reloaded when a sync brings in the partner's changes. Derived each time, never stored.
 */
export function useProgramCounts(): State {
  const { children, events } = useRepositories();
  const { settings } = useGoalSettings();
  const { state: syncState } = useSync();
  const [state, setState] = useState<State>({ status: 'loading' });
  const { programStart, programEnd } = settings;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [child] = await children.list();
      const today = toLocalDate(new Date());
      const lastDay = today < programEnd ? today : programEnd;
      if (!child || lastDay < programStart) {
        if (!cancelled) setState({ status: 'ready', rows: [], lastDay });
        return;
      }
      const rows = await events.countsByTypeAndDay(child.id, programStart, lastDay);
      if (!cancelled) setState({ status: 'ready', rows, lastDay });
    })().catch(() => !cancelled && setState({ status: 'failed' }));
    return () => {
      cancelled = true;
    };
  }, [children, events, programStart, programEnd, syncState.revision]);

  return state;
}
