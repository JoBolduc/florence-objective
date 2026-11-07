import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { BASE_DATE, toLocalDate, useRepositories } from '@/db';

import { buildGoalSettings, KEYS, programEndFor, DEFAULT_PROGRAM_WEEKS } from './goal-settings';
import type { GoalSettings } from './goal-settings';

interface GoalSettingsValue {
  settings: GoalSettings;
  /** The daily target changes from today on; earlier days keep theirs. */
  setDailyTarget(target: number): Promise<void>;
  setProgram(start: string, end: string): Promise<void>;
  setMastery(rule: { windowDays: number; greenDays: number; yellowDays: number }): Promise<void>;
}

const Context = createContext<GoalSettingsValue | null>(null);

/** Settings are read once and kept in memory; every write reloads them for all screens. */
export function GoalSettingsProvider({ children }: { children: ReactNode }) {
  const { goalSettings } = useRepositories();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof goalSettings.list>> | null>(null);
  const [fallbackStart, setFallbackStart] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setRows(await goalSettings.list());
  }, [goalSettings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await goalSettings.list();
      const hasStart = stored.some((r) => r.key === KEYS.programStart);
      // First launch with this feature: the program started with the first logged sign, or today.
      const start = hasStart
        ? null
        : ((await goalSettings.firstEventDate()) ?? toLocalDate(new Date()));
      if (start) {
        await goalSettings.save(KEYS.programStart, start);
        await goalSettings.save(KEYS.programEnd, programEndFor(start, DEFAULT_PROGRAM_WEEKS));
      }
      const loaded = start ? await goalSettings.list() : stored;
      if (!cancelled) {
        setFallbackStart(start ?? toLocalDate(new Date()));
        setRows(loaded);
      }
    })().catch(() => {
      if (!cancelled) {
        setFallbackStart(toLocalDate(new Date()));
        setRows([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [goalSettings]);

  const memo = useMemo<GoalSettingsValue | null>(() => {
    if (!rows || !fallbackStart) return null;
    const settings = buildGoalSettings(rows, fallbackStart);
    return {
      settings,
      async setDailyTarget(target) {
        await goalSettings.save(KEYS.dailyTarget, String(target), toLocalDate(new Date()));
        await reload();
      },
      async setProgram(start, end) {
        await goalSettings.save(KEYS.programStart, start, BASE_DATE);
        await goalSettings.save(KEYS.programEnd, end, BASE_DATE);
        await reload();
      },
      async setMastery(rule) {
        await goalSettings.save(KEYS.masteryWindowDays, String(rule.windowDays));
        await goalSettings.save(KEYS.masteryGreenDays, String(rule.greenDays));
        await goalSettings.save(KEYS.masteryYellowDays, String(rule.yellowDays));
        await reload();
      },
    };
  }, [rows, fallbackStart, goalSettings, reload]);

  // Nothing renders before the settings are known, so no screen flashes a wrong target.
  if (!memo) return null;
  return <Context.Provider value={memo}>{children}</Context.Provider>;
}

export function useGoalSettings(): GoalSettingsValue {
  const value = useContext(Context);
  if (!value) throw new Error('useGoalSettings must be used inside GoalSettingsProvider');
  return value;
}
