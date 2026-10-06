import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import type { DrillSessionRecord } from '@/types/domain';

/** History is kept on this phone only, and only for this long. */
export const HISTORY_RETENTION_DAYS = 30;

const RETENTION_MS = HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const HISTORY_KEY_PREFIX = 'gymbeam.history.v1.';

const sessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  startedAt: z.string(),
  endedAt: z.string(),
  targets: z.array(z.object({ x: z.number(), y: z.number() })),
  runs: z.array(z.object({ targetTimesSeconds: z.array(z.number()), missedTargets: z.number() })),
  isMock: z.boolean(),
});

/** Drops sessions older than the retention window; newest first. */
export function pruneExpired(
  sessions: DrillSessionRecord[],
  now: number = Date.now(),
): DrillSessionRecord[] {
  return sessions
    .filter((session) => now - Date.parse(session.startedAt) <= RETENTION_MS)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

/** Each account on the phone gets its own history, keyed by user id. */
export const drillHistoryStorage = {
  async load(userId: string): Promise<DrillSessionRecord[]> {
    const raw = await AsyncStorage.getItem(HISTORY_KEY_PREFIX + userId);
    if (!raw) return [];

    let stored: DrillSessionRecord[];
    try {
      stored = z.array(sessionSchema).parse(JSON.parse(raw));
    } catch {
      return [];
    }

    const kept = pruneExpired(stored);
    if (kept.length !== stored.length) {
      await this.save(userId, kept);
    }
    return kept;
  },

  async save(userId: string, sessions: DrillSessionRecord[]): Promise<void> {
    await AsyncStorage.setItem(HISTORY_KEY_PREFIX + userId, JSON.stringify(pruneExpired(sessions)));
  },
};
