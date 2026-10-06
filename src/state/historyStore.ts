import { create } from 'zustand';

import { drillHistoryStorage, pruneExpired } from '@/storage/drillHistoryStorage';
import type { DrillSessionRecord } from '@/types/domain';
import { createLogger } from '@/utils/logger';

const logger = createLogger('state.history');

type HistoryState = {
  userId: string | null;
  sessions: DrillSessionRecord[];
  isLoaded: boolean;
  load: (userId: string | null) => Promise<void>;
  add: (session: DrillSessionRecord) => Promise<void>;
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  userId: null,
  sessions: [],
  isLoaded: false,

  load: async (userId) => {
    set({ userId, sessions: [], isLoaded: false });
    const sessions = userId ? await readSessions(userId) : [];
    // A different account may have signed in while this was reading.
    if (get().userId === userId) {
      set({ sessions, isLoaded: true });
    }
  },

  add: async (session) => {
    const { userId, isLoaded } = get();
    if (!userId) return;

    const existing = isLoaded ? get().sessions : await readSessions(userId);
    const sessions = pruneExpired([session, ...existing.filter((s) => s.id !== session.id)]);
    if (get().userId === userId) {
      set({ sessions, isLoaded: true });
    }
    try {
      await drillHistoryStorage.save(userId, sessions);
    } catch (error) {
      logger.warn('saving drill history failed', { message: (error as Error)?.message });
    }
  },
}));

async function readSessions(userId: string): Promise<DrillSessionRecord[]> {
  try {
    return await drillHistoryStorage.load(userId);
  } catch (error) {
    logger.warn('loading drill history failed', { message: (error as Error)?.message });
    return [];
  }
}
