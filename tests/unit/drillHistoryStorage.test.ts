import AsyncStorage from '@react-native-async-storage/async-storage';

import { useHistoryStore } from '@/state/historyStore';
import { drillHistoryStorage, pruneExpired } from '@/storage/drillHistoryStorage';
import type { DrillSessionRecord } from '@/types/domain';

const DAY_MS = 24 * 60 * 60 * 1000;

function sessionFrom(daysAgo: number, id = `s-${daysAgo}`): DrillSessionRecord {
  const startedAt = new Date(Date.now() - daysAgo * DAY_MS).toISOString();
  return {
    id,
    name: 'Custom drill',
    startedAt,
    endedAt: startedAt,
    targets: [{ x: 1, y: 1 }],
    runs: [{ targetTimesSeconds: [1.2], missedTargets: 0 }],
    isMock: true,
  };
}

describe('drill history', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHistoryStore.setState({ userId: null, sessions: [], isLoaded: false });
  });

  it('keeps 30 days of sessions, newest first, and drops anything older', () => {
    const kept = pruneExpired([sessionFrom(29), sessionFrom(31), sessionFrom(0)]);

    expect(kept.map((s) => s.id)).toEqual(['s-0', 's-29']);
  });

  it('removes expired sessions from the phone when history is loaded', async () => {
    await AsyncStorage.setItem(
      'gymbeam.history.v1.user-1',
      JSON.stringify([sessionFrom(1), sessionFrom(45)]),
    );

    expect((await drillHistoryStorage.load('user-1')).map((s) => s.id)).toEqual(['s-1']);
    expect(JSON.parse((await AsyncStorage.getItem('gymbeam.history.v1.user-1'))!)).toHaveLength(1);
  });

  it('returns an empty history when what is stored is unreadable', async () => {
    await AsyncStorage.setItem('gymbeam.history.v1.user-1', '{not json');

    expect(await drillHistoryStorage.load('user-1')).toEqual([]);
  });

  it('survives an app restart, and keeps each account’s history separate', async () => {
    await useHistoryStore.getState().load('user-1');
    await useHistoryStore.getState().add(sessionFrom(0, 'mine'));

    await useHistoryStore.getState().load('user-2');
    expect(useHistoryStore.getState().sessions).toEqual([]);

    await useHistoryStore.getState().load('user-1');
    expect(useHistoryStore.getState().sessions.map((s) => s.id)).toEqual(['mine']);
  });
});
